---
title: mysql连接池
date: 2025-09-02 20:48:36
comments: true
tags: mysql连接池
categories: mysql连接池
updated: 2025-09-03 21:26:00
excerpt: MySQL连接池学习
---

## 项目目的

**为了提高MySQL数据库(基于C/S设计)的访问瓶颈，除了在服务端增加缓存服务器(例如redis)缓存常用的数据之外，还可增加连接池，来提高MySQL Server的访问效率，在高并发情况下，大量的TCP三次握手，MySQL Server连接认证，MySQL Server关闭连接回收资源和TCP四次挥手所耗费的性能时间也是很明显的，增加连接池就是为了减少这一部分的损耗。**

## 项目功能点介绍

**该项目是基于C++语言实现的连接池。主要实现连接池的基础功能。**

**初始连接量(initSize):表示连接池事先会和MySQL Server创建initSize个数的connection连接，当应用发起MySQL访问时，不用再创建和MySQL Server新的连接，直接从连接池中获取一个可用的连接就可以，使用完成后，并不去释放connection,而是把当前connection再归还到线程池当中。**

**最大连接量(maxSize):当并发访问MySQL Server的请求增多时，初始连接量已经不够用了。此时会根据新的请求数量去创建更多的应用去使用，但是新创建的连接数量上限是maxSize,不能无限制的创建连接，因为每一个连接都会占用socket资源，一般连接池和服务程序是部署在一台主机上的，如果连接池占用过多的socket资源，那么服务器就不能接收太多的客户端请求。当这些连接使用完成后，再次归还到连接池当中维护。**

**最大空闲时间(maxIdleTime):当访问MySQL的并发请求多了以后，连接池里面的连接数量会动态增加，上限是maxSize个，当这些连接使用完再次归还到连接池当中。如果在指定的maxIdleTime里面，这些新增加的连接都没有被再次使用过，那么新增加的这些连接资源就要被回收掉，只需要保持初始连接量initSize个连接就可以了。**

**连接超时时间(connectionTimeout):当MySQL的并发请求量过大，连接池中的连接数量已经到达maxSize了，而此时没有空闲的连接可供使用，那么此时应用从连接池获取连接无法成功。它通过阻塞的方式获取连接的时间如果超过connectionTimeout,那么获取连接失败，无法访问数据库。**

## **功能实现设计**

**ConnectionPool.cpp和ConnectionPool.h：连接池代码。**

**Connection.cpp和Connection.h:数据库操作代码，增删改查代码**

**连接池具体功能点：**

1. **连接池只需要一个实例，所以ConnectionPool以单例模式设计**
2. **从ConnectionPool中可以获取和MySQL的连接Connection**
3. **空闲连接Connection全部维护在一个线程安全的Connection队列中，使用线程互斥锁保证队列的线程安全**
4. **如果Connection队列为空，还需要再获取连接，此时需要动态创建连接，上限数量是maxSize**
5. **队列中空闲连接时间超过maxIdleTime的就要被释放掉，只保留初始的initSize个连接就可以了，这个功能点肯定需要放在独立的线程中去做。**
6. **如果Connection队列为空，而此时连接的数量已达上限maxSize,那么等待connectionTimeout时间如果还获取不到空闲的连接，那么连接获取失败，此处从Connection队列获取空闲连接，可以使用带超时时间的mutex互斥锁来实现连接超时时间**
7. **用户获取的连接用shared_ptr智能指针来管理，用lambda表达式定制连接释放的功能(不真正释放连接，而是把连接归还到连接池中)**
8. **连接的生产和连接的消费采用生产者-消费者模型来设计，使用了线程间的同步通信机制条件变量和互斥锁。**

## 具体代码实现

**mysql.ini**

```bash
#数据库连接池的配置文件
ip=127.0.0.1
port=3306
username=root
password=123456
dbname=chat
initSize=10
maxSize=1024
#最大空闲时间默认单位是秒
maxIdleTime=60
#连接超时时间单位是毫秒
connectionTimeout=100
```

**public.h**

```c++
#pragma once
//方便输出日志，定位问题
#define LOG(str) \
std::cout<< __FILE__ <<":"<<__LINE__<<":"<<\
__TIMESTAMP__<<":"<<str<<std::endl;
```

**connection.h**

```c++
#pragma once
#include<mysql.h>
#include <iostream>
#include <string>
#include <ctime>
/*
实现数据库的增删改查
*/
class Connection
{
public:
	//初始化数据库连接
	Connection();
	//释放数据库连接资源
	~Connection();
	//连接数据库
	bool connect(std::string ip, 
		unsigned short port, 
		std::string user,
		std::string password,
		std::string dbname);
	//更新操作 insert,delete,update
	bool update(std::string sql);
	//查询操作
	MYSQL_RES* query(std::string sql);

	//刷新连接的起始的空闲时间点
	void refreshAliveTime()
	{
		_alivetime = clock();
	}
	//返回存活的时间
	clock_t getAlivetime() const
	{
		return clock() - _alivetime;
	}
private:
	MYSQL* _conn;//表示和MySQL Server的一条连接
	clock_t _alivetime;//记录进入空闲状态后的起始存活时间
};
```

**connection.cpp**

```c++
#include"connection.h"
#include "public.h"

Connection::Connection()
{
	//初始化数据库连接
	_conn = mysql_init(nullptr);
}
Connection::~Connection()
{
	//释放数据库连接资源
	if (_conn != nullptr)
	{
		mysql_close(_conn);
	}
}
bool Connection::connect(std::string ip,
	unsigned short port,
	std::string user,
	std::string password,
	std::string dbname)
{
	//连接数据库
	MYSQL* p = mysql_real_connect(_conn, ip.c_str(), user.c_str(), password.c_str(), dbname.c_str(), port, nullptr, 0);
	return p != nullptr;
}
bool Connection::update(std::string sql)
{
	//更新操作
	if (mysql_query(_conn, sql.c_str()))
	{
		LOG("更新失败" + sql);
		return false;
	}
	return true;
}

MYSQL_RES* Connection::query(std::string sql)
{
	if (mysql_query(_conn, sql.c_str()))
	{
		LOG("查询失败：" + sql);
		return nullptr;
	}
	return mysql_use_result(_conn);
}
```

**ConnectionPool.h**

```c++
#pragma once
#include <string>
#include <queue>
#include "connection.h"
#include <mutex>
#include <atomic>
#include <thread>
#include <memory>
#include <functional>
#include <condition_variable>
/*
实现连接池的模块

*/
class ConnectionPool
{
public:
	//获取连接池对象实例
	static ConnectionPool* getConnectionPool();
	//给外部提供接口，从连接池中获取一个可用的空闲连接
	std::shared_ptr<Connection> getConnection();//使用智能指针返回，使用自定义删除器实现析构时不会释放资源放回连接池。
private:
	ConnectionPool();//#1 单例的构造函数私有化
	bool loadConfigFile();//从配置文件中加载配置项
	//运行在独立的线程中，专门负责生产新连接
	void produceConnectionTask();
	//运行在独立的线程中，专门负责扫描多余的空闲连接，超过maxIdleTime时间的空闲连接，进行多余的连接回收
	void scannerConnectionTask();
	std::string _ip;//mysql的ip地址
	unsigned short _port;//mysql的端口号
	std::string _username;//mysql的登录用户名
	std::string _password;//mysql的登录密码
	std::string _dbname;//连接的数据库名称
	int _initSize;//连接池的初始连接量
	int _maxSize;//连接池的最大连接量
	int _maxIdleTime;//连接池最大空闲时间
	int _connectionTimeout;//连接池获取连接的超时时间

	std::queue<Connection*> _connectionQue;//存储mysql的队列
	std::mutex _queueMutex;//维护连接队列的线程安全互斥锁
	std::atomic_int _connectionCnt;//记录连接所创建的connection连接的总数量
	std::condition_variable cv;//设置条件变量，用于连接生产线程和消费线程的通信
};
```

**ConnectionPool.cpp**

```c++

#include "CommonConnectionPool.h"
#include "public.h"
//线程安全的懒汉单例函数接口
ConnectionPool* ConnectionPool::getConnectionPool()
{
	static ConnectionPool pool;
	return &pool;
}
//从配置文件中加载配置项
bool ConnectionPool::loadConfigFile()
{
	FILE* pf = fopen("mysql.ini", "r");
	if (pf == nullptr)
	{
		LOG("mysql.ini file is not exist!");
		return false;
	}
	//feof判断文件是否到末尾，是为真，不是为假
	while (!feof(pf))
	{
		char line[1024] = { 0 };
		fgets(line, 1024, pf);
		std::string str = line;
		int idx = str.find('=', 0);
		if (idx == -1)
		{
			continue;
		}
		int endidx = str.find('\n', idx);
		std::string key = str.substr(0, idx);
		std::string value = str.substr(idx + 1, endidx - idx - 1);

		if (key == "ip")
		{
			_ip = value;
		}
		else if (key == "port")
		{
			_port = atoi(value.c_str());
		}
		else if (key == "username")
		{
			_username = value;
		}
		else if (key == "password")
		{
			_password = value;
		}
		else if (key == "initSize")
		{
			_initSize = atoi(value.c_str());
		}
		else if (key == "maxSize")
		{
			_maxSize = atoi(value.c_str());
		}
		else if (key == "maxIdleTime")
		{
			_maxIdleTime = atoi(value.c_str());
		}
		else if (key == "connectionTimeout")
		{
			_connectionTimeout = atoi(value.c_str());
		}
		else if (key == "dbname")
		{
			_dbname = value;
		}
	}
	return true;
}
//连接池的构造
ConnectionPool::ConnectionPool()
{
	//加载配置项
	if (!loadConfigFile())
	{
		return;
	}
	//创建初始数量的连接
	for (int i = 0;i < _initSize;++i)
	{
		Connection* p = new Connection();
		p->connect(_ip, _port, _username, _password, _dbname);
		p->refreshAliveTime();//刷新进入空闲的起始时间
		_connectionQue.push(p);
		_connectionCnt++;
	}
	//启动一个新的线程，作为连接的生产者
	std::thread produce(std::bind(&ConnectionPool::produceConnectionTask,this));
	produce.detach();
	//启动一个新的定时线程，扫描多余的空闲连接，超过maxIdleTime时间的空闲连接，进行多余的连接回收
	std::thread scanner(std::bind(&ConnectionPool::scannerConnectionTask, this));
	scanner.detach();
}
//运行在独立的线程中，专门负责生产新连接
void ConnectionPool::produceConnectionTask()
{
	for (;;)
	{
		std::unique_lock<std::mutex> lock(_queueMutex);
		while (!_connectionQue.empty())
		{
			cv.wait(lock);//队列不空，此处生产线程进入等待状态
		}
		//连接数量没有到达上限，继续创建新的连接
		if (_connectionCnt < _maxSize)
		{
			Connection* p = new Connection();
			p->connect(_ip, _port, _username, _password, _dbname);
			p->refreshAliveTime();//刷新进入空闲的起始时间
			_connectionQue.push(p);
			_connectionCnt++;
		}
		//通知消费者线程，可以消费连接了
		cv.notify_all();
	}
}
//给外部提供接口，从连接池中获取一个可用的空闲连接
std::shared_ptr<Connection> ConnectionPool::getConnection()
{
	std::unique_lock<std::mutex> lock(_queueMutex);
	while(_connectionQue.empty())
	{
		//如果发现连接池没有连接，让消费者线程在_connectionTimeout时间内一直看是否可以拿到连接，这里不要用sleep
		if (std::cv_status::timeout == cv.wait_for(lock, std::chrono::milliseconds(_connectionTimeout)))
		{
			if (_connectionQue.empty())
			{
				LOG("获取空闲连接超时了。。。获取连接失败！");
				return nullptr;
			}
		}	
	}
	/*
	shared_ptr智能指针析构时，会把connection资源直接delete，相当于调用connection的析构函数，connection就被close掉。
	这里需要自定义shared_ptr的资源释放方式，把connection直接归还到queue当中
	*/
	std::shared_ptr<Connection> sp(_connectionQue.front(),
		[&](Connection* pcon)
		{
			//这里是在服务器应用线程中调用，所以一定要考虑队列的线程安全操作
			std::unique_lock<std::mutex> lock(_queueMutex);
			pcon->refreshAliveTime();//刷新进入空闲的起始时间
			_connectionQue.push(pcon);
		});
	_connectionQue.pop();
	if (_connectionQue.empty())
	{
		//谁消费了队列中的最后一个connection,谁负责通知一下生产者生产连接
		cv.notify_all();
	}
	return sp;
}

void ConnectionPool::scannerConnectionTask()
{
	for (;;)
	{
		//通过sleep模拟定时效果
		std::this_thread::sleep_for(std::chrono::seconds(_maxIdleTime));
		//扫描整个队列，释放多余的连接
		std::unique_lock<std::mutex> lock(_queueMutex);
		while (_connectionCnt > _initSize)
		{
			Connection* p = _connectionQue.front();
			if (p->getAlivetime() >= _maxIdleTime*1000)
			{
				_connectionQue.pop();
				_connectionCnt--;
				delete p;
			}
			else
			{
				break;//前面的空闲时间是大于后面的空闲时间
			}
		}
	}
}
```

## 压力测试

**main.cpp**

```c++
#include <iostream>
#include "connection.h"
#include "CommonConnectionPool.h"
int main()
{
	/*
	测试connection的功能实现
	
	Connection conn;
	char sql[1024] = { 0 };
	sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')","zhangsan",20,"male");
	conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
	conn.update(sql);
	*/

#if 0
    //单线程无连接池
	clock_t begin = clock();
	for (int i = 0;i < 10000;++i)
	{
		Connection conn;
		char sql[1024] = { 0 };
		sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
		conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
		conn.update(sql);
	}
	clock_t end = clock();
	std::cout << (end - begin) << "ms" << std::endl;
	/*1000：5217ms*/
	/*5000：27932ms*/
	/*10000：55293ms*/
	
	//单线程有连接池
	clock_t begin = clock();
	ConnectionPool* cp = ConnectionPool::getConnectionPool();
	for (int i = 0;i < 5000;++i)
	{
		std::shared_ptr<Connection> sp=cp->getConnection();
		char sql[1024] = { 0 };
		sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
		sp->update(sql);
	}
	clock_t end = clock();
	std::cout << (end - begin) << "ms" << std::endl;
	
	/*1000：3412ms*/
	/*5000：16225ms*/
	/*10000：31749ms*/
#endif
#if 0
    //四线程有连接池
	clock_t begin = clock();
	ConnectionPool* cp = ConnectionPool::getConnectionPool();
	std::thread t1([&]() {
		for (int i = 0;i < 2500;++i)
		{
			std::shared_ptr<Connection> sp = cp->getConnection();
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			sp->update(sql);
		}
		});
	std::thread t2([&]() {
		for (int i = 0;i < 2500;++i)
		{
			std::shared_ptr<Connection> sp = cp->getConnection();
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			sp->update(sql);
		}
		});
	std::thread t3([&]() {
		for (int i = 0;i < 2500;++i)
		{
			std::shared_ptr<Connection> sp = cp->getConnection();
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			sp->update(sql);
		}
		});
	std::thread t4([&]() {
		for (int i = 0;i < 2500;++i)
		{
			std::shared_ptr<Connection> sp = cp->getConnection();
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			sp->update(sql);
		}
		});
	t1.join();
	t2.join();
	t3.join();
	t4.join();
	clock_t end = clock();
	std::cout << (end - begin) << "ms" << std::endl;
	/*1000：2208ms*/
	/*5000：10748ms*/
	/*10000：20639ms*/
#endif
    //四线程无连接池
	Connection conn;
	clock_t begin = clock();
	conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
	std::thread t1([&]() {
		for (int i = 0;i < 2500;++i)
		{
			Connection conn;
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
			conn.update(sql);
		}
		});
	std::thread t2([&]() {
		for (int i = 0;i < 2500;++i)
		{
			Connection conn;
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
			conn.update(sql);
		}
		});
	std::thread t3([&]() {
		for (int i = 0;i < 2500;++i)
		{
			Connection conn;
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
			conn.update(sql);
		}
		});
	std::thread t4([&]() {
		for (int i = 0;i < 2500;++i)
		{
			Connection conn;
			char sql[1024] = { 0 };
			sprintf(sql, "insert into user(name,age,sex) values('%s',%d,'%s')", "zhangsan", 20, "male");
			conn.connect("127.0.0.1", 3306, "root", "123456", "chat");
			conn.update(sql);
		}
		});
	t1.join();
	t2.join();
	t3.join();
	t4.join();
	clock_t end = clock();
	std::cout << (end - begin) << "ms" << std::endl;
	return 0;
	/*1000：2297ms*/
	/*5000：11222ms*/
	/*10000：22342ms*/
}
```

