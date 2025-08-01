---
title: c++实现集群聊天服务器
date: 2025-06-02 23:57:52
comments: true
tags: C++ chatserver
categories: c++实现集群聊天服务器
updated: 2025-06-23 23:30:00
---

## json学习

```cpp
#include "json.hpp"
using json=nlohmann::json;
```

使用json,要包含json的头文件 ，方便使用可以重命名nlohmann::json为json。

```cpp
//json序列化示例1
std::string func1(){
    json js;
    js["msg_type"]=2;
    js["from"]="zhang san";
    js["to"] = "li si";
    js["msg"]="hello,what are you doing now";
    std::string sendBuf=js.dump();
    std::cout<<sendBuf.c_str()<<std::endl;
    return sendBuf;
}
```

js使用很像键值对。js.dump()是 nlohmann::json库中用于将 JSON 对象序列化（转为字符串）的方法，它会把一个 json类型的变量转换成 JSON 格式的字符串。

```cpp
	std::string recvBuf= func1();
    //数据的反序列化 json字符串-》反序列化数据对象（看作容器，方便访问）
    json jsbuf=json::parse(recvBuf);
    std::cout<<jsbuf["msg_type"]<<std::endl;
    std::cout<<jsbuf["from"]<<std::endl;
    std::cout<<jsbuf["to"]<<std::endl;
    std::cout<<jsbuf["msg"]<<std::endl;
```

这是main函数中执行。`json::parse()` 是 `nlohmann::json` 库中用来将 **JSON 字符串 → JSON 对象** 的函数，也就是实现**反序列化**。

转化为json对象后使用对应的键可以把对应的值取出来。结果：

```
{"from":"zhang san","msg":"hello,what are you doing now","msg_type":2,"to":"li si"}
2
"zhang san"
"li si"
"hello,what are you doing now"
```

```cpp
//json序列化示例2
std::string func2(){
    json js;
    //添加数组
    js["id"]={1,2,3,4,5};
    //添加key-value
    js["name"]="zhang san";
    //添加对象
    js["msg"]["zhang san"]= "hello world";
    js["msg"]["liu shuo"] ="hello china";
    //上面等同下面这句一次性添加数组对象
    js["msg"]={{"zhang san","hello world"},{"liu shuo","hello china"}};
    std::cout<<js<<std::endl;
    return js.dump();
}
```

json还可以放数组，还可以嵌套json语句。

```cpp
std::string recvBuf= func2();
    //数据的反序列化 json字符串-》反序列化数据对象（看作容器，方便访问）
    json jsbuf=json::parse(recvBuf);
    std::cout<<jsbuf["id"]<<std::endl;
    auto arr=jsbuf["id"];
    std::cout<<arr[2]<<std::endl;
    auto msgjs=jsbuf["msg"];
    std::cout<<msgjs["zhang san"]<<std::endl;
    std::cout<<msgjs["liu shuo"]<<std::endl;
```

“id”存储的是一个数组，取出来还可以作为数组使用。“msg”存储的值还可以是json语句，并且可以进入再取里面的值。

结果：

```
{"id":[1,2,3,4,5],"msg":{"liu shuo":"hello china","zhang san":"hello world"},"name":"zhang san"}
[1,2,3,4,5]
3
"hello world"
"hello china"
```

```cpp
//json序列化示例3
std::string func3(){
    json js;
    //直接序列化一个vector容器
    std::vector<int> vec;
    vec.push_back(1);
    vec.push_back(2);
    vec.push_back(5);
    js["list"]=vec;
    //直接序列化一个map容器
    std::map<int,std::string> m;
    m.insert({1,"黄山"});
    m.insert({2,"华山"});
    m.insert({3,"泰山"});
    js["path"] =m;
    std::string sendBuf =js.dump();//json数据对象->序列化json字符串
    std::cout<<sendBuf<<std::endl;
    return sendBuf;

}
```

还可以序列化容器。

```cpp
std::string recvBuf= func3();
    //数据的反序列化 json字符串-》反序列化数据对象（看作容器，方便访问）
    json jsbuf=json::parse(recvBuf);
    std::vector<int> vec =jsbuf["list"];//js对象里面的数组类型，直接放入vector容器当中
    for(int &v:vec){
        std::cout<<v<<" ";
    }
    std::cout<<std::endl;
    std::map<int,std::string> mymap=jsbuf["path"];
    for(auto &p:mymap){
        std::cout<<p.first<<" "<<p.second<<std::endl;
    }
    std::cout<<std::endl;
    return 0;
```

结果：

```
{"list":[1,2,5],"path":[[1,"黄山"],[2,"华山"],[3,"泰山"]]}
1 2 5 
1 黄山
2 华山
3 泰山
```

## muduo网络库学习

**muduo** 是一个现代 C++ 的非阻塞 I/O 网络库，采用 **Reactor 模式 + 多线程 + epoll + 定时器 + 高效缓冲区 + 智能指针设计**，在性能和工程性方面都表现非常优秀。

```cpp
/*
muduo网络库给用户提供了两个主要的类
TcpServer :用于编写服务器程序的
TcpClient :用于编写客户端程序的

epoll+线程池
好处：能够把网络I/O的代码和业务代码区分开了
业务代码 :用户的连接和断开 用户的可读写事件
*/
#include<muduo/net/TcpServer.h>
#include<muduo/net/EventLoop.h>
#include <functional>
#include <iostream>
#include <string>
using namespace std;
using namespace muduo;
using namespace muduo::net;
using namespace placeholders;
/*基于muduo网络库开发服务器程序
1.组合TcpServer对象
2.创建EventLoop事件循环对象的指针
3.明确TcpServer构造函数需要什么参数，输出ChatServer的构造函数
4.在当前服务器类的构造函数当中，注册处理连接的回调函数和处理读写事件的回调函数
5.设置合适的服务端线程数量，muduo库会自己分配I/O线程和worker线程
*/
class ChatServer{
public:
    ChatServer(EventLoop* loop,//事件循环
            const InetAddress& listenAddr,//ip+port
            const string& nameArg)//服务器的名字
        :_server(loop,listenAddr,nameArg),_loop(loop)
        {
            //给服务器注册用户连接的创建和断开回调
            _server.setConnectionCallback(std::bind(&ChatServer::onConnection,this,_1));            
            //给服务器注册用户读写事件回调
            _server.setMessageCallback(std::bind(&ChatServer::onMessage,this,_1,_2,_3));
            //设置服务器端的线程数量 1个I/o线程 3个worker线程
            _server.setThreadNum(4);
        }
        //开启事件循环
        void start(){
            _server.start();
        }
private:
    //专门处理用户的连接创建和断开
    void onConnection(const TcpConnectionPtr&conn){
        
        if(conn->connected()){
            cout<<conn->peerAddress().toIpPort()<<"->"<<
            conn->localAddress().toIpPort()<<"state:online"<<endl;
        }else{//对方关闭连接或断开
            cout<<conn->peerAddress().toIpPort()<<"->"<<
            conn->localAddress().toIpPort()<<"state:offline"<<endl;
            conn->shutdown(); //close(fd)//关闭连接
            // _loop->quit();通常用于程序结束或手动控制关闭 Muduo
            //loop->quit() 使loop.loop()不再阻塞。
        }
    }
    //专门处理用户的读写事件
    void onMessage(const TcpConnectionPtr&conn,//连接
                            Buffer* buffer,//缓冲区
                            Timestamp time)//接受数据的时间信息
    {
        //是一个指向 muduo::net::Buffer 对象的指针，用于暂存客户端发送的数据。
		//Muduo 采用 非阻塞、事件驱动的方式，当客户端发送数据时，数据先被读入 Buffer 中，之后由用户注册的回调函数（例如 			onMessage）来处理。
        //retrieveAllAsString()把缓冲区中的所有可读数据提取为一个 std::string，然后清空缓冲区。
        string buf=buffer->retrieveAllAsString();
        cout<<"recv data:" <<buf<<"time:"<<time.toString()<<endl;
        conn->send(buf);//原封不动发回去                        
    }
    muduo::net::TcpServer _server;
    muduo::net::EventLoop *_loop;
};
int main(){
    EventLoop loop;//epoll
    InetAddress addr("127.0.0.1",6000);
    ChatServer server(&loop,addr,"ChatServer");
    server.start();//listenfd epoll_ctl->epoll
    loop.loop(); //epoll wait以阻塞方式等待新用户连接，已连接用户的读写事件等
    return 0;
}
```

先将bind函数讲清楚，

基本格式

```
std::bind(&类名::成员函数, 对象指针, 占位符参数...)
```

所以：

```
std::bind(&ChatServer::onConnection, this, _1)
```

意思是：

把当前对象（`this`）的 `onConnection` 成员函数绑定起来，形成一个可调用对象，并接受一个参数 `_1`。

分解解释

| 组件                        | 说明                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `&ChatServer::onConnection` | 指向 `ChatServer` 类的成员函数 `onConnection` 的指针         |
| `this`                      | 当前对象的指针，告诉 `bind` 这个函数是哪个对象的方法（即调用 this->onConnection） |
| `_1`                        | 占位符，代表回调传入的第一个参数，实际调用时会被替换         |
|                             |                                                              |

最终生成一个 `std::function<void(const TcpConnectionPtr&)>` 类型的函数对象。

## CMakeList.txt学习

主CMakeList.txt

```
cmake_minimum_required(VERSION 3.10)

project(chat)

#配置编译选项
set(CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS} -g)
#配置最终的可执行文件输出的路径
set(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)
#配置头文件搜索路径
include_directories(${PROJECT_SOURCE_DIR}/include)
include_directories(${PROJECT_SOURCE_DIR}/include/server)

#加载子目录
add_subdirectory(src)
```

src文件夹下的CMakeList.txt

```
add_subdirectory(server)
```

src文件夹下的server文件夹下的CMakeList.txt

```
#定义了SRC_LIST变量，包含了当前目录下的所有源文件
aux_source_directory(. SRC_LIST) #获取当前目录下所有源文件
#指定生成可执行文件
add_executable(ChatServer ${SRC_LIST})
#指定可执行文件需要链接的库
target_link_libraries(ChatServer muduo_net muduo_base pthread) #链接muduo库和pthread库
```

### 项目常见的cmake指令使用步骤

```
mkdir build
cd build
cmake ..
make         # 如果你使用的是 Unix/Linux/macOS，或者是 MinGW
```

解释：

- `mkdir build`：创建构建目录（推荐 out-of-source build）
- `cd build`：进入构建目录
- `cmake ..`：执行 CMake，读取上一级目录的 `CMakeLists.txt`，生成构建系统（默认是 Makefile）
- `make`：使用生成的 Makefile 编译项目

## 集群聊天服务器

### 项目目录

![1](c-实现集群聊天服务器/1.png)

bin文件夹编译完成后的 `.exe`（Windows）或无扩展的可执行文件。

build文件夹通常用于存放 **构建过程中产生的所有中间文件**，它是整个编译流程的“临时工作区”。

include文件夹存放头文件（Header Files），src文件夹是 C++ 项目中最常见也最核心的目录之一，用于存放 **源代码实现文件（source files）**，主要是 `.cpp` 文件（也包括 `.c`, `.cc`, `.cxx` 等）。

test文件夹在 C++ 项目中用于存放**测试代码**，主要用于验证项目功能是否正确，确保每个模块在修改后仍然可以正常工作。

thirdparty文件夹在 C++ 项目中用于存放**第三方依赖库的源码或接口文件**。在这里存储了json.hpp文件。

### CMakeLists.txt文件存放和使用

CMakeLists.txt文件放在了主目录，src文件夹里，src/server文件夹里，接下来分别说明对应文件夹中CMakeLists.txt的作用。

主目录文件夹

```
cmake_minimum_required(VERSION 3.10)

project(chat)

#配置编译选项
set(CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS} -g)
#配置最终的可执行文件输出的路径
set(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)
#配置头文件搜索路径
include_directories(${PROJECT_SOURCE_DIR}/include)
include_directories(${PROJECT_SOURCE_DIR}/include/server)
include_directories(${PROJECT_SOURCE_DIR}/include/server/db)
include_directories(${PROJECT_SOURCE_DIR}/thirdparty)

#加载子目录
add_subdirectory(src)
```

主目录 `CMakeLists.txt` 的作用概括：

1. **设置项目基本信息**：指定 CMake 最低版本和项目名称。
2. **配置全局编译选项**：例如添加调试信息（`-g`）以便调试。
3. **设置可执行文件输出路径**：统一将程序输出到 `bin/` 目录。
4. **配置头文件搜索路径**：包括项目头文件目录和第三方库目录，便于代码引用。
5. **组织子目录构建**：通过 `add_subdirectory(src)` 加载 `src` 子目录，交由其继续组织源码编译。

src文件夹

```
add_subdirectory(server)
```

`add_subdirectory(server)` 把 `server` 子目录纳入构建流程，交由其内部的 `CMakeLists.txt` 具体定义编译规则，是模块化项目管理的关键步骤。

src/server文件夹

```
#定义了SRC_LIST变量，包含了当前目录下的所有源文件
aux_source_directory(. SRC_LIST) #获取当前目录下所有源文件
aux_source_directory(./db DB_LIST)#获取db文件下的所有源文件
#指定生成可执行文件
add_executable(ChatServer ${SRC_LIST} ${DB_LIST})
#指定可执行文件需要链接的库
target_link_libraries(ChatServer muduo_net muduo_base mysqlclient pthread) #链接muduo库和pthread库
```

`src/server/CMakeLists.txt` 的作用概括：

1. **收集源文件**：自动获取当前目录和 `db` 子目录下的所有 `.cpp` 文件。
2. **生成可执行程序**：将源文件编译为 `ChatServer` 可执行文件。
3. **链接依赖库**：链接 Muduo 网络库、MySQL 客户端库和 pthread 线程库。

### thirdparty文件夹（第三方库）json.hpp

聊天服务器项目中，`json.hpp` 负责处理客户端与服务端之间的 JSON 数据格式，承担消息的 **解析、构建与传输格式化**，是通信协议的关键组件。

### include/server/chatserver.hpp 聊天服务器的主类

```cpp
#ifndef CHATSERVER_H
#define CHATSERVER_H

#include <muduo/net/TcpServer.h>
#include <muduo/net/EventLoop.h>
#include <functional>
using namespace std::placeholders;
using namespace std;
using namespace muduo;
using namespace muduo::net;
//聊天服务器的主类
class ChatServer
{
public:
    //初始化聊天服务器队对象
    ChatServer(EventLoop* loop,
            const InetAddress& listenAddr,
            const string& nameArg);
    //启动服务
    void start();
private:
    //上报连接相关信息的回调函数
    void onConnection(const TcpConnectionPtr& conn);
    //上报读写事件的回调函数
    void onMessage(const TcpConnectionPtr& conn,
            Buffer* buffer,
            Timestamp time);
    TcpServer _server;//组合的muduo库，实现服务器功能的类对象
    EventLoop *_loop;//指向事件循环的指针
};

#endif
```

`ChatServer.h` 作用及结构概括

1. **类功能**

定义了聊天服务器的主类 `ChatServer`，负责网络服务的初始化、启动和事件处理。

2. **成员变量**

- `_server`：`muduo::net::TcpServer` 对象，负责网络连接管理和服务端监听。
- `_loop`：`muduo::net::EventLoop` 指针，负责事件循环和调度。

3. **核心接口**

- 构造函数 `ChatServer(EventLoop*, const InetAddress&, const string&)`：初始化服务器监听地址、名称和事件循环。
- `start()`：启动服务器监听，进入事件循环。

4. **回调函数**（私有）

- `onConnection()`：处理客户端连接和断开事件。
- `onMessage()`：处理客户端消息接收事件，进行消息读写。

`ChatServer` 类是整个聊天项目的网络核心，利用 Muduo 库提供的 TCP 服务器功能，封装了网络事件的注册与处理，负责服务器端的网络通信逻辑。

### src/server/chatserver.cpp

```c++
#include "chatserver.hpp"
#include <string>
#include "chatservice.hpp"
#include <functional>
#include "json.hpp"
using json =nlohmann::json;
//初始化聊天服务器队对象
ChatServer::ChatServer(EventLoop* loop,
            const InetAddress& listenAddr,
            const string& nameArg)
    : _server(loop, listenAddr, nameArg),
      _loop(loop)
{
    //注册连接回调
    _server.setConnectionCallback(
        std::bind(&ChatServer::onConnection, this, std::placeholders::_1));
    //注册消息回调
    _server.setMessageCallback(
        std::bind(&ChatServer::onMessage, this, std::placeholders::_1,
                  std::placeholders::_2, std::placeholders::_3));
    //设置线程数量
    _server.setThreadNum(4);
}
//启动服务
void ChatServer::start(){
    _server.start();
}

//上报连接相关信息的回调函数
void ChatServer::onConnection(const TcpConnectionPtr& conn){
    //客户端断开连接
    if(!conn->connected()){
        conn->shutdown();
    }
}
    //上报读写事件的回调函数
void ChatServer::onMessage(const TcpConnectionPtr& conn,
            Buffer* buffer,
            Timestamp time)
{
    string buf=buffer->retrieveAllAsString();
    //数据的反序列化
    json js=json::parse(buf);
    //达到的目的:完全解耦网络模块的代码和业务模块的代码
    //通过js["msgid"] 获取=》业务handler=>conn js time
    auto msgHandler=ChatService::instance()->getHandler(js["msgid"].get<int>());
    //回调消息绑定好的事件处理器，来执行相应的业务处理
    msgHandler(conn,js,time);
    
}
```

ChatServer.cpp 作用与关键点概括

1. **构造函数初始化**

- 初始化 Muduo 的 TCP 服务器对象 `_server` 和事件循环 `_loop`。
- 注册回调函数：
  - `onConnection` 处理连接建立与断开；
  - `onMessage` 处理客户端消息。
- 设置线程数为4，支持多线程处理网络事件。

2. **启动服务**

- `start()` 调用 Muduo 的 `_server.start()` 启动监听和事件循环。

3. **连接回调 `onConnection`**

- 判断客户端是否断开连接，断开时调用 `conn->shutdown()` 关闭连接。

4. **消息回调 `onMessage`**

- 将网络缓冲区中的数据读取为字符串。
- 使用 `json.hpp` 将字符串反序列化成 JSON 对象。
- 通过消息中的 `"msgid"` 字段，调用业务层 `ChatService` 获取对应的消息处理函数（回调）。
- 执行该消息处理函数，完成具体的业务逻辑处理。

------

作用总结

这段代码实现了聊天服务器的核心网络处理逻辑，做到：

- **网络层与业务层解耦**：网络部分只负责收发和解析数据，业务处理由 `ChatService` 中注册的处理器完成。
- **灵活消息分发**：根据 JSON 中的 `msgid` 动态调用对应业务处理函数，实现消息驱动机制。
- **高效异步处理**：基于 Muduo 多线程事件循环模型，支持高并发网络请求。

### include/server/chatservice.hpp 聊天服务器业务类

```c++
#ifndef CHATSERVICE_H
#define CHATSERVICE_H
#include <muduo/net/TcpConnection.h>
#include <unordered_map>
#include <functional>
#include "json.hpp"
using namespace std;
using namespace muduo;
using namespace muduo::net;
using json =nlohmann::json;
//表示处理消息的事件回调方法类型
using MsgHandler = std::function<void(const TcpConnectionPtr &conn,json &js,Timestamp)>;
//聊天服务器业务类
class ChatService{
public:
    //获取单例对象的接口函数
    static ChatService * instance();
    //处理登录业务
    void login(const TcpConnectionPtr &conn,json &js,Timestamp);
    //处理注册业务
    void reg(const TcpConnectionPtr &conn,json &js,Timestamp);
    //获取消息对应的处理器
    MsgHandler getHandler(int msgid);
private:
    ChatService();
    //存储消息id和其对应的业务处理方法
    unordered_map<int,MsgHandler> _msgHandlerMap;
};


#endif
```

ChatService.h 作用与结构概括

1. **类功能**

- 负责处理聊天服务器的核心业务逻辑，如登录、注册等。
- 管理消息 ID 与对应的处理函数的映射，实现消息的动态分发。

2. **核心类型**

- `MsgHandler`：消息处理函数类型，参数包括 TCP 连接指针、JSON 消息对象和时间戳。

3. **接口函数**

- `static ChatService* instance()`：单例模式，获取业务服务唯一实例。
- `void login(...)`：处理登录业务逻辑。
- `void reg(...)`：处理注册业务逻辑。
- `MsgHandler getHandler(int msgid)`：根据消息 ID 获取对应的消息处理函数。

4. **成员变量**

- `_msgHandlerMap`：存储消息 ID 与处理函数的映射，支持根据消息类型快速调用相应业务处理器。

### src/server/chatservice.cpp

```c++
#include "chatservice.hpp"
#include "public.hpp"
#include <string>
#include <muduo/base/Logging.h>
using namespace muduo;
using namespace std;
//获取单例对象的接口函数
//在cpp文件就不需要写static了
ChatService * ChatService::instance(){
    static ChatService service;
    return &service;
}
//注册消息以及对应的Handler回调操作
 ChatService::ChatService(){
    //注册业务
    _msgHandlerMap.insert({LOGIN_MSG,std::bind(&ChatService::login,this,_1,_2,_3)});
    _msgHandlerMap.insert({REG_MSG,std::bind(&ChatService::reg,this,_1,_2,_3)});
 }
//获取消息对应的处理器
 MsgHandler ChatService::getHandler(int msgid){
    //记录错误日志，msgid没有对应的事件处理回调
    auto it =_msgHandlerMap.find(msgid);
    if(it ==_msgHandlerMap.end()){
        //返回一个默认的处理器，空操作
        return [=](const TcpConnectionPtr &conn,json &js,Timestamp){
            LOG_ERROR<<"msgid:"<< msgid <<"can not find handler!";
        };
    }
    else{
        return _msgHandlerMap[msgid];
    }
}
//处理登录业务
void ChatService::login(const TcpConnectionPtr &conn,json &js,Timestamp){
    LOG_INFO <<"do login service!!!!";
}
//处理注册业务
void ChatService::reg(const TcpConnectionPtr &conn,json &js,Timestamp){
    LOG_INFO<<"do reg service!!!";
}
```

ChatService.cpp 作用和关键点

1. **单例模式实现**

- `instance()` 函数内部静态变量实现线程安全的单例模式，保证 `ChatService` 只有一个实例。

2. **构造函数注册消息处理函数**

- 在构造函数中通过 `_msgHandlerMap.insert` 将消息 ID（`LOGIN_MSG`、`REG_MSG`）绑定到成员函数 `login` 和 `reg` 的回调。
- 使用 `std::bind` 绑定成员函数和 `this` 指针，方便后续调用。

3. **动态消息处理函数获取**

- `getHandler(int msgid)` 根据传入的消息 ID 返回对应的处理函数。
- 如果消息 ID 未注册，返回一个默认空操作的 lambda，同时写错误日志，保证系统健壮性。

4. **业务处理函数示例**

- `login()` 和 `reg()` 目前仅打印日志，代表登录和注册的业务处理接口，后续可以扩展具体业务逻辑。

### include/public.hpp

```c++
#ifndef PUBLIC_H
#define PUBLIC_H

/*
server和client的公共文件
*/
enum EnMsgType{
    LOGIN_MSG = 1,//登录消息
    REG_MSG//注册消息
};
#endif
```

public.h 作用简述

- **共享消息类型定义**
  - 定义了枚举类型 `EnMsgType`，用于区分不同的消息类型。
  - 目前包含两种消息：
    - `LOGIN_MSG = 1`：登录消息
    - `REG_MSG`：注册消息
- **作用**
  - 服务端和客户端都包含这个头文件，保证双方对消息类型有统一的理解和对应关系，方便通信协议的设计与实现。

### src/server/main.cpp

```c++
#include "chatserver.hpp"
#include <iostream>
using namespace std;

int main(){
    EventLoop loop;
    InetAddress addr("127.0.0.1",6000);
    ChatServer server(&loop, addr, "ChatServer");
    server.start();
    //开启事件循环
    loop.loop();
    return 0;
}
```

**启动聊天服务器**：
 创建事件循环和服务器监听地址，初始化 `ChatServer` 对象，启动服务器后进入事件循环，开始接受和处理客户端连接与消息。

### include/server/db/db.h 数据库操作类

```c++
#ifndef DB_H
#define DB_H
#include<mysql/mysql.h>
#include<string>
using namespace std;
// 数据库操作类
class MySQL
 {
 public:
 // 初始化数据库连接
MySQL();
// 释放数据库连接资源
~MySQL();
// 连接数据库
bool connect();
// 更新操作
bool update(string sql);
// 查询操作
MYSQL_RES* query(string sql);
//获取连接
MYSQL * getConnection();
private:
    MYSQL *_conn;
};
#endif
```

**MySQL 数据库操作类说明**

**类功能**

封装对 MySQL 数据库的连接、查询和更新操作，方便上层业务调用。

**主要成员函数**

- **构造函数 `MySQL()`**：初始化数据库连接相关资源。
- **析构函数 `~MySQL()`**：释放数据库连接资源。
- **`bool connect()`**：连接数据库，返回连接是否成功。
- **`bool update(string sql)`**：执行更新类 SQL 语句（如 INSERT、UPDATE、DELETE）。
- **`MYSQL_RES* query(string sql)`**：执行查询类 SQL 语句，返回结果集指针。
- **`MYSQL* getConnection()`**：获取底层 MySQL 连接对象，便于其他操作。

**成员变量**

- **`MYSQL *_conn`**：指向 MySQL 连接句柄的指针。

### src/server/db/db.cpp

```c++
#include "db.h"
#include <muduo/base/Logging.h>
// 数据库配置信息
static string server = "127.0.0.1";
static string user = "root";
static string password = "123456";
static string dbname = "chat";
// 初始化数据库连接
MySQL::MySQL()
{
    _conn = mysql_init(nullptr);
}
// 释放数据库连接资源
MySQL::~MySQL()
{
    if (_conn != nullptr)
    mysql_close(_conn);
}
// 连接数据库
bool MySQL::connect()
{
    MYSQL *p = mysql_real_connect(_conn, server.c_str(), user.c_str(),password.c_str(), dbname.c_str(), 3306, nullptr, 0);
    if (p != nullptr)
    {
        //C和C++代码默认的编码字符是ASCII,如果不设置，从MySQL上拉下来的中文显示？
        mysql_query(_conn, "set names gbk");
        LOG_INFO << "connect mysql success!";
    }else{
        LOG_INFO << "connect mysql failed!";
    }
    return p;
}
// 更新操作
bool MySQL::update(string sql)
{
    if (mysql_query(_conn, sql.c_str()))
    {
        LOG_INFO << __FILE__ << ":" << __LINE__ << ":"
                << sql << "更新失败!";
            return false;
    }
    return true;
}
// 查询操作
MYSQL_RES* MySQL::query(string sql)
{
    if (mysql_query(_conn, sql.c_str()))
        {
            LOG_INFO << __FILE__ << ":" << __LINE__ << ":"
                << sql << "查询失败!";
            return nullptr;
        }
    return mysql_use_result(_conn);
}
//获取连接
MYSQL * MySQL::getConnection(){
    return _conn;
}
```

**MySQL 类实现功能简述**

1. **初始化连接**
   - 构造函数 `MySQL()` 调用 `mysql_init` 初始化 MySQL 连接对象。
2. **释放连接资源**
   - 析构函数 `~MySQL()` 关闭数据库连接，释放资源。
3. **连接数据库**
   - `connect()` 使用 `mysql_real_connect` 连接到数据库。
   - 成功连接后设置字符集为 `gbk`，防止中文乱码。
   - 通过日志打印连接成功或失败信息。
4. **执行更新操作**
   - `update(string sql)` 执行 SQL 更新语句（如 INSERT、UPDATE、DELETE）。
   - 失败时打印错误日志，返回 `false`。
5. **执行查询操作**
   - `query(string sql)` 执行 SQL 查询语句。
   - 返回查询结果指针，失败时返回 `nullptr`。
6. **获取底层连接**
   - `getConnection()` 返回当前的 MySQL 连接指针，方便其他数据库操作调用。

### include/server/user.hpp 数据库中user表对应的类

```c++
#ifndef USER_H
#define USER_H
#include<string>
using namespace std;
//User表的ORM类
class User{
    public:
        User(int id=1,string name="",string pwd="",string state="offline"){
            this->id=id;
            this->name=name;
            this->password=pwd;
            this->state=state;
        }
        void setId(int id){this->id=id;}
        void setName(string name){this->name=name;}
        void setPwd(string pwd){this->password=pwd;}
        void setState(string state){this->state=state;}

        int getId(){return this->id;}
        string getName(){return this->name;}
        string getPwd(){return this->password;}
        string getState(){return this->state;}
    private:
        int id;
        string name;
        string password;
        string state;
};
#endif
```

**`User` 类作用概括：**

1. **ORM 映射作用**

- 该类是对数据库 `User` 表的一个对象化表示（Object-Relational Mapping）。
- 将数据库中的一条用户记录封装成一个 C++ 对象，便于在程序中操作。

2. **属性封装**

类中包含如下用户信息字段：

- `id`: 用户编号
- `name`: 用户名
- `password`: 用户密码
- `state`: 用户状态（如 `"online"` / `"offline"`）

3. **基本接口功能**

提供了以下功能函数：

- 构造函数（支持默认值）
- `setXXX()` 设置各字段值
- `getXXX()` 获取各字段值

**项目中的实际用途**

基于 Muduo 的聊天服务器项目中：

- 用户数据从数据库中查询出来后，可以封装成 `User` 类对象；
- 在业务逻辑中传递用户信息时，使用 `User` 类便于管理；
- 与数据库交互模块（如 DAO 类）进行数据传递、封装与解封装；
- 便于将用户信息序列化为 JSON 数据发送到客户端。

### include/server/usermodel.hpp  user表的数据操作类

```c++
#ifndef USERMODEL_H
#define USERMODEL_H



#include "user.hpp"
//user表的数据操作类
class UserModel{
public:
    //User表的增加方法
    bool insert(User &user);
};


#endif
```

`#ifndef/#define/#endif`：防止头文件重复包含（include guard）；

`#include "user.hpp"`：引入用户实体类定义；

`class UserModel`：封装了对 `User` 表的数据库操作；

`bool insert(User &user)`：定义了插入用户的方法，返回是否成功。

### src/server/usermodel.cpp

```c++
#include "usermodel.hpp"
#include "db.h"
#include <iostream>
using namespace std;
//User表的增加方法
bool UserModel::insert(User &user){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"insert into User(name,password,state) values('%s','%s','%s')",
        user.getName().c_str(),user.getPwd().c_str(),user.getState().c_str());
    MySQL mysql;
    if(mysql.connect()){
        if(mysql.update(sql)){
            //获取插入成功的用户数据生成的主键id
            user.setId(mysql_insert_id(mysql.getConnection()));
            return true;
        }
    }
    return false;
}
```

`sprintf` 组装 SQL；

`MySQL` 是你自定义的数据库操作类，封装了 `connect()` 和 `update()`；

插入成功后，用 `mysql_insert_id()` 获取刚插入的记录主键 ID。

### 注册业务实现

#### 实现步骤

public.hpp

```c++
enum EnMsgType{
    LOGIN_MSG = 1,//登录消息
    REG_MSG,//注册消息
    REG_MSG_ACK //注册响应消息
};
```

再加上REG_MSG_ACK 注册响应消息，告诉客户端已经收到消息。

chatservice.hpp

```c++
private:
    ChatService();
    //存储消息id和其对应的业务处理方法
    unordered_map<int,MsgHandler> _msgHandlerMap;
    //数据操作类对象
    UserModel _userModel;
```

在private中加入数据操作类对象UserModel _userModel，这个是自定义的对象在usermodel.hpp

chatservice.cpp

```c++
void ChatService::reg(const TcpConnectionPtr &conn,json &js,Timestamp){
    string name=js["name"];
    string pwd=js["password"];
    User user;
    user.setName(name);
    user.setPwd(pwd);
    bool state=_userModel.insert(user);
    if(state){
        //注册成功
        json response;
        response["msgid"]= REG_MSG_ACK;
        response["errno"]=0;
        response["id"]=user.getId();
        conn->send(response.dump());
    }else{
        //注册失败
        json response;
        response["msgid"]= REG_MSG_ACK;
        response["errno"]=1;
        conn->send(response.dump());
    }
}
```

在ChatService类的reg函数，负责处理注册业务的。js中存储的是我们的消息以json存储的。这里面的字段例如msgid,name,password都是服务端和客户端约定好的。首先将消息中的name,和password拿出来赋值给User类对象user,注册业务，把对应的值存入数据库chat中的User表中。当数据操作类对象_userModel插入成功时，返回消息给客户端，msgid是客户端和服务端规定的消息类型，消息REG_MSG_ACK注册后的回应消息。返回的消息有消息类型和是否注册成功的标志errno(0表示成功，1表示失败)，注册失败id也不会产生，所以不用发了。最后使用json的dump()函数转换为字符串通过conn的send函数再发出去。

#### conn是TcpConnectionPtr类型

`TcpConnectionPtr` 是 **Muduo 网络库** 中定义的一个智能指针类型，指向 `TcpConnection` 对象，通常用于表示一条活跃的 TCP 连接。

```c++
typedef std::shared_ptr<TcpConnection> TcpConnectionPtr;
```

它的生命周期由 `Muduo` 网络库自动管理。

常见成员函数（通过 `TcpConnectionPtr` 调用）

- `conn->send(data)`：发送数据到客户端
- `conn->shutdown()`：关闭连接（半关闭）
- `conn->connected()`：是否仍保持连接
- `conn->peerAddress()`：对端地址
- `conn->localAddress()`：本地地址
- `conn->setContext()` / `conn->getContext()`：绑定上下文（可保存登录信息、用户ID等）

#### 实现注册业务时出现的问题

实现注册业务时，使用vscod远程连接Linux出现了连接数据库不上的问题。

```
20250604 13:22:35.282815Z 18893 INFO  connect mysql failed!Access denied for user 'root'@'localhost' - db.cpp:29
```

数据库拒绝了 root 用户从 localhost 的访问请求。

解决方案

1.使用Linux root用户登录mysql

2.修改root用户认证方式为密码登录

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '123456';
FLUSH PRIVILEGES;
EXIT;
```

第一句ALTER USER修改存在的用户 'root'@'localhost'用户名为root,本地连接。IDENTIFIED WITH mysql_native_password 设置认证插件为 `mysql_native_password`（密码方式）

第二句MySQL 会将用户和权限信息缓存在内存中，这条命令强制它 重新加载所有权限表。`ALTER USER` 做的更改立即生效，而不必重启 MySQL 服务

第三句对用户权限和密码的修改完成了，退出命令行界面即可。

`auth_socket` 是 MySQL 默认的一种用户认证方式，**主要用于本地登录**，**不使用密码，而是通过操作系统身份验证**。MySQL 会验证：

- 你是否是当前 Linux 系统的 `root` 用户；
- 如果是，允许登录；
- 否则，拒绝访问，即使你输入了正确的密码也没用。

### 登录业务实现

#### 实现步骤：

public.hpp

```c++
enum EnMsgType{
    LOGIN_MSG = 1,//登录消息
    LOGIN_MSG_ACK,//登录响应消息
    REG_MSG,//注册消息
    REG_MSG_ACK //注册响应消息
};
```

加入LOGIN_MSG_ACK,//登录响应消息

usermodel.hpp

```c++
    //根据用户号码查询用户信息
    User query(int id);
    //更新用户的状态信息
    bool updateState(User user);
```

加入这两个函数，后面会在登录业务用到

usermodel.cpp 对应函数的具体实现

```c++
//根据用户号码查询用户信息
User UserModel::query(int id){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"select * from User where id=%d",id);
    MySQL mysql;
    if(mysql.connect()){
        MYSQL_RES* res=mysql.query(sql);
        if(res!=nullptr){//查询成功
            MYSQL_ROW row=mysql_fetch_row(res);//查一行
            if(row!=nullptr){
                User user;
                user.setId(atoi(row[0]));//转换id为int，从数据库取出的都是字符串
                user.setName(row[1]);//用户名
                user.setPwd(row[2]);//密码
                user.setState(row[3]);//状态，以上是根据查询出的结果集取得
                mysql_free_result(res);//释放结果集资源
                return user;
            }
        }
    }
    return User();
}
//更新用户的状态信息
bool UserModel::updateState(User user){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"update User set state = '%s' where id = %d",user.getState().c_str(),user.getId());
    MySQL mysql;
    if(mysql.connect()){
        if(mysql.update(sql)){
            return true;
        }
    }
    return false;
}
```

chatservice.cpp

实现login函数

```c++
//处理登录业务 id pwd
void ChatService::login(const TcpConnectionPtr &conn,json &js,Timestamp){
    int id=js["id"];
    string pwd=js["password"];
    User user=_userModel.query(id);
    if(user.getId()==id&&user.getPwd()==pwd){
        if(user.getState()=="online"){
            //该用户已经登录，不允许重复登录
            json response;
            response["msgid"]= LOGIN_MSG_ACK;
            response["errno"]=2;
            response["errmsg"]="该账号已经登录，请输入新账号";
            conn->send(response.dump());
        }else
        {
            //登录成功，更新用户状态信息 state offline=>online
            user.setState("online");
            _userModel.updateState(user);
            json response;
            response["msgid"]= LOGIN_MSG_ACK;
            response["errno"]=0;
            response["id"]=user.getId();
            response["name"]=user.getName();
            conn->send(response.dump());
        }
        
        
    }else{
        //该用户不存在，登陆失败
        json response;
        response["msgid"]= LOGIN_MSG_ACK;
        response["errno"]=1;
        response["errmsg"]="用户名或者密码错误";
        conn->send(response.dump());
    }
}
```

### 记录用户的连接信息及线程安全性

因为要实现用户与用户之间的消息往来，所以要实现记录上线用户的连接信息和下线的删除。

chatservice.hpp private:

```c++
//存储在线用户的通信连接 注意线程安全
    unordered_map<int,TcpConnectionPtr> _userConnMap;
```

那么这个值在什么时候更新，首先在登录成功时，添加连接

chatservice.cpp login函数

```c++
_userConnMap.insert({id,conn});//unordered_map容器没有线程安全需要添加线程互斥操作
```

当然插入了还不够，多个用户连接服务器，_userConnMap这个是在多线程环境下，要保证线程互斥性。

大多数 **C++ STL 容器本身**（如 `vector`、`map`、`unordered_map` 等）**不是线程安全的**。

所以我们要在对这个插入数据加锁。

chatservice.hpp private:

```c++
//记得包含头文件#include <mutex>
//定义互斥锁，保证_userConnMap的线程安全
    mutex _connMutex;
```

chatservice.cpp login函数 

还是在登录成功那里

```c++
{
     //登录成功，记录用户连接信息
     lock_guard<mutex> lock(_connMutex);//如果不析构，得得遇到}为止，都是互斥，所以加个域
     _userConnMap.insert({id,conn});//unordered_map容器没有线程安全需要添加线程互斥操作
}
```

有人会问为什么再加一个花括号，这是为了让lock_guard的生命周期结束，这个变量的特性是构造时加锁，析构时自动解锁。

### 客户端异常退出业务

当客户端异常退出时，我们的数据库还没有修改当前状态时在线还是下线，所以要实现这个业务

chatservice.cpp 定义公共函数clientCloseException

```c++
//处理客户端异常退出
void clientCloseException(const TcpConnectionPtr &conn);
```

chatservice.cpp 对应函数实现

```c++
//处理客户端异常退出
void ChatService::clientCloseException(const TcpConnectionPtr &conn){
    User user;
    {
        lock_guard<mutex> lock(_connMutex);//如果不析构，得得遇到}为止，都是互斥，所以加个域
        for(auto it=_userConnMap.begin();it!=_userConnMap.end();++it){
            if(it->second == conn){
                user.setId(it->first);
                //从map表删除用户的连接信息
                _userConnMap.erase(it);
                break;
            }
        }
    }
    //更新用户的状态信息
    if(user.getId()!=-1){
        user.setState("offline");
        _userModel.updateState(user);
    }
}
```

chatserver.cpp  onConnection函数

```c++
 if(!conn->connected()){
        //处理异常退出业务，state更新为offline
        ChatService::instance()->clientCloseException(conn);
        conn->shutdown();
    }
```

在确认断开后，使用clientCloseException将state更新为offline。

### 一对一聊天业务：在线聊天实现

public.hpp 加入聊天消息ONE_CHAT_MSG

```c++
/*
server和client的公共文件
*/
enum EnMsgType{
    LOGIN_MSG = 1,//登录消息
    LOGIN_MSG_ACK,//登录响应消息
    REG_MSG,//注册消息
    REG_MSG_ACK, //注册响应消息
    ONE_CHAT_MSG, //聊天消息
};
```

既然注册了业务，所以还要在chatservice.cpp的构造函数，注册业务

```c++
 _msgHandlerMap.insert({ONE_CHAT_MSG,std::bind(&ChatService::oneChat,this,_1,_2,_3)});
```

chatservice.hpp 声明一对一聊天业务函数声明

```c++
//一对一聊天业务
    void oneChat(const TcpConnectionPtr &conn,json &js,Timestamp);
```

chatservice.cpp 声明一对一聊天业务函数声明

```c++
void ChatService::oneChat(const TcpConnectionPtr &conn,json &js,Timestamp){
    int toid=js["to"];
    {
        lock_guard<mutex> lock(_connMutex);
        auto it=_userConnMap.find(toid);
        if(it!=_userConnMap.end()){
            //toid在线，转发消息
            //凡涉及_userConnMap注意线程安全性
            //服务器主动推送原消息给toid用户
            it->second->send(js.dump());
            return;
        }
    }
    //toid不在线，存储离线信息
}
```

这里js里面的构成是

msgid //消息类型
id	发消息的id
from 发消息的name
to	接受方的id
msg 要发送的消息

在线发送消息整体实现就是服务端接收到消息，之后查看接受用户是否在线，在线则调出服务端与接收端的连接，转发原消息。

### 一对一聊天业务：离线消息

首先离线消息是存储在数据库的一张表里

这张表只有两个字段userid和message 这里就不用ORM映射构造一个类来保留，所以我们直接构造一个关于这张表的操作类OfflineMsgModel

offlinemessagemodel.hpp

```c++
#include<string>
#include<vector>
using namespace std;
//提供离线消息表的操作接口方法
class OfflineMsgModel{
public:
    //存储用户的离线消息
    void insert(int userid,string msg);

    //删除用户的离线消息
    void remove(int userid);

    //查询用户的离线消息
    vector<string> query(int userid);
};

```

offlinemessagemodel.cpp

```c++
#include "offlinemessagemodel.hpp"
#include "db.h"
// 存储用户的离线消息
void OfflineMsgModel::insert(int userid, string msg){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"insert into offlineMessage values(%d,'%s')",userid,msg.c_str());
    MySQL mysql;
    if(mysql.connect()){
        mysql.update(sql);
    }
}

// 删除用户的离线消息
void  OfflineMsgModel::remove(int userid){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"delete from offlineMessage where userid=%d",userid);
    MySQL mysql;
    if(mysql.connect()){
        mysql.update(sql);
    }
}

// 查询用户的离线消息并返回对应id的消息数组
vector<string>  OfflineMsgModel::query(int userid){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"select message from offlineMessage where userid=%d",userid);
    MySQL mysql;
    vector<string> vec;   
    if(mysql.connect()){
        MYSQL_RES* res=mysql.query(sql);
        if(res!=nullptr){//查询成功
             //把userid用户的所有离线消息放入vec中返回
             //查多行
             MYSQL_ROW row;
             while((row=mysql_fetch_row(res))!=nullptr){
                vec.push_back(row[0]);
             }
             mysql_free_result(res);
             return vec;
        }
    }
    return vec;
}
```

构造好对应的数据操作类，要在chatservice类实现功能

chatservice.hpp 添加对应类的声明

```c++
OfflineMsgModel _offlineMsgModel;
```

chatservice.cpp

首先在用户登录成功后，要查看离线表中是否有属于它的离线消息，所以在login函数中登录成功板块还要添加

```c++
//查询该用户是否有离线消息
            vector<string> vec=_offlineMsgModel.query(id);
            if(!vec.empty()){
                response["offlinemsg"]=vec;
                //读取该用户的离线消息后，把该用户的所有离线消息删除掉
                _offlineMsgModel.remove(id);
            }
```

首先查询对应id是否有离线消息存在，存到vector数组中，如果不为空的话，response添加offlinemsg字段存储离线消息，并且在服务端删除属于接收端的离线消息，做完这些转发给接收端。

还有存储离线消息在onechat函数中对应的接收端不在线，存储离线消息在服务端。

```c++
//toid不在线，存储离线信息
    _offlineMsgModel.insert(toid,js.dump());
```

这样一对一的聊天业务就算实现了。

### 服务器异常退出问题解决（ctrl+c退出）

这里遇到的问题是服务器异常退出，User表中用户们的在线状态并没有改变，所以我们要将其改变。

因为这里数据库的操作，所以在usermodel.cpp UserModel类实现resetState函数，记得在hpp文件声明

```c++
//重置用户的状态信息
void UserModel::resetState(){
    //1 组装sql语句
    char sql[1024] ="update User set state = 'offline' where state = 'online'";
    MySQL mysql;
    if(mysql.connect()){
        mysql.update(sql);
    }
}
```

这个函数就在chatservice.cpp中ChatService类的reset新函数调用

```c++
//服务器异常，业务重置方法
void ChatService::reset(){
    //把online状态的用户，设置成offline
    _userModel.resetState();
}
```

最后在main.cpp实现这一功能

```c++
//处理服务器ctrl+c结束后，重置user的状态信息
void resetHandler(int){
    ChatService::instance()->reset();
    exit(0);
}
```

在main函数添加对应的信号

```c++
int main(){
    signal(SIGINT,resetHandler);
    EventLoop loop;
    InetAddress addr("127.0.0.1",6000);
    ChatServer server(&loop, addr, "ChatServer");
    server.start();
    //开启事件循环
    loop.loop();
    return 0;
}
```

重点：signal(SIGINT,resetHandler);

注册信号处理函数

- **`SIGINT`** 是一个信号，表示 **中断信号**，通常在终端按下 `Ctrl+C` 时触发。
- **`resetHandler`** 是你定义的函数，用来在收到这个信号时执行一些清理逻辑。它的参数类型必须是 `int`，因为它接受信号编号

当然signal(SIGINT,resetHandler);这句话也不能随便放，得放在服务端启动前。

SIGINT 信号是：

Interrupt Signal（中断信号），编号是 2，表示用户希望中断（终止）正在运行的程序。

常见触发方式：

- 当你在 终端/命令行里运行一个程序时，按下 Ctrl + C，操作系统就会向该程序发送一个 SIGINT 信号。

举个例子：

```
bash复制编辑$ ./chat_server
# 运行中...

# 你按下 Ctrl+C
```

这时，系统向 `chat_server` 进程发送 `SIGINT` 信号：

- 如果你没处理这个信号，程序会**直接终止**；
- 如果你写了 `signal(SIGINT, resetHandler);`，就会先执行 `resetHandler()`，再退出。

背后原理：

- Linux/Unix 中，信号（signal）是一种**异步通知机制**，用于通知进程发生了某种事件。
- `SIGINT` 是一种 **软件信号**，由终端驱动程序发送给前台进程组。

常见信号对比：

| 信号名    | 编号 | 含义                           | 默认行为          |
| --------- | ---- | ------------------------------ | ----------------- |
| `SIGINT`  | 2    | 终端中断（Ctrl+C）             | 终止进程          |
| `SIGTERM` | 15   | 程序终止（系统或用户发送）     | 终止进程          |
| `SIGKILL` | 9    | 强制终止（不能捕获）           | 立即终止进程      |
| `SIGQUIT` | 3    | 退出（Ctrl+\）并生成 core dump | 终止+生成转储文件 |
| `SIGSEGV` | 11   | 段错误（访问非法内存）         | 终止进程          |

总结一句话：SIGINT 是终端用户通过 Ctrl+C 发出的“中断信号”，默认会终止程序，但你可以捕获它，在程序退出前做一些清理处理。

### 添加好友业务代码

public.hpp

```c++
enum EnMsgType{
    LOGIN_MSG = 1,//登录消息
    LOGIN_MSG_ACK,//登录响应消息
    REG_MSG,//注册消息
    REG_MSG_ACK, //注册响应消息
    ONE_CHAT_MSG, //聊天消息
    ADD_FRIEND_MSG,//添加好友消息
};
```

添加ADD_FRIEND_MSG,//添加好友消息

添加好友在数据库中对应的一张Friend表，其中字段是userid和friendid,所以我们实现一个操控Friend表的model类

friendmodel.hpp

```c++
#ifndef FRIENDMODEL_H
#define FRIENDMODEL_H
#include "user.hpp"
#include<vector>
using namespace std;

//维护好友信息的操作接口方法
class FriendModel{
public:
    //添加好友关系
    void insert(int userid,int friendid);

    //返回用户好友列表 friendid
    vector<User> query(int userid);
};



#endif
```

friendmodel.cpp

```c++
#include "friendmodel.hpp"
#include "db.h"
//添加好友关系
void FriendModel::insert(int userid,int friendid){
    //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"insert into Friend values(%d,%d)",userid,friendid);
    MySQL mysql;
    if(mysql.connect()){
        mysql.update(sql);
    }
}

//返回用户好友列表 friendid
vector<User> FriendModel::query(int userid){
     //1 组装sql语句
    char sql[1024] ={0};
    sprintf(sql,"select a.id,a.name,a.state from User a inner join Friend b on b.friendid=a.id where b.userid=%d",userid);
    MySQL mysql;
    vector<User> vec;   
    if(mysql.connect()){
        MYSQL_RES* res=mysql.query(sql);
        if(res!=nullptr){//查询成功
             //把userid用户的所有离线消息放入vec中返回
             //查多行
             MYSQL_ROW row;
             while((row=mysql_fetch_row(res))!=nullptr){
                User user;
                user.setId(atoi(row[0]));
                user.setName(row[1]);
                user.setState(row[2]);
                vec.push_back(user);
             }
             mysql_free_result(res);
             return vec;
        }
    }
    return vec;
}
```

insert函数实现的是将好友关系加到数据库中。query返回的是从数据库中返回的好友数据。

当然还有一个业务绑定

首先在chatservice.hpp声明一个FriendModel对象

```c++
FriendModel _friendModel;
```

在ChatService的构造函数实现绑定

```c++
_msgHandlerMap.insert({ADD_FRIEND_MSG,std::bind(&ChatService::addFriend,this,_1,_2,_3)});
```

在chatservice.hpp声明一个addFriend的函数

addFriend函数实现:

```c++
//添加好友业务 msgid id friendid
void ChatService::addFriend(const TcpConnectionPtr &conn,json &js,Timestamp){
    int userid=js["id"];
    int friendid=js["friendid"];
    //存储好友信息
    _friendModel.insert(userid,friendid);

}
```

这里收到的json消息格式为

```json
{"msgid":6,"id":1,"friendid":2}
```

还有一个问题，在用户登录时，也要好友信息的显示，所以在用户登陆成功时，服务端也要把好友信息发给用户端。

所以在服务端登录的回复信息这里需要加上好友信息

```c++
//查询该用户的好友信息并返回
            vector<User> userVec=_friendModel.query(id);
            if(!userVec.empty()){
               vector<string> vec2;
               for(User &user:userVec){
                json js;
                js["id"]=user.getId();
                js["name"]=user.getName();
                js["state"]=user.getState();
                vec2.push_back(js.dump());
               }
               response["friends"]=vec2;
            }
```

这里添加好友的业务就实现了。

### 群组业务

首先要实现群组业务，我在数据库有两张表实现群组业务AllGroup和GroupUser

AllGroup的数据结构：

```sql
+-----------+--------------+------+-----+---------+----------------+
| Field     | Type         | Null | Key | Default | Extra          |
+-----------+--------------+------+-----+---------+----------------+
| id        | int          | NO   | PRI | NULL    | auto_increment |
| groupname | varchar(50)  | NO   |     | NULL    |                |
| groupdesc | varchar(200) | YES  |     |         |                |
+-----------+--------------+------+-----+---------+----------------+
```

GroupUSer的数据结构

```sql
+------------+--------------------------+------+-----+---------+-------+
| Field      | Type                     | Null | Key | Default | Extra |
+------------+--------------------------+------+-----+---------+-------+
| groupid    | int                      | NO   | PRI | NULL    |       |
| userid     | int                      | NO   |     | NULL    |       |
| groupprole | enum('creator','normal') | YES  |     | normal  |       |
+------------+--------------------------+------+-----+---------+-------+
```

groupuser.hpp

```c++
#ifndef GROUPUSER_H
#define GROUPUSER_H
#include "user.hpp"
//群组用户，多了个role角色信息，从User类直接继承，复用User的其他信息
//对应的GroupUser表，但是光是这张表的不够，还要联表查询，所以继承User类。
class GroupUser:public User{
public:
    void setRole(string role){this->role=role;}
    string getRole(){return this->role;}
private:
    string role;
};

#endif
```

GroupUser类对象是记录关于组成员的详细信息的类，所以继承User。

group.hpp

```c++
#ifndef GROUP_H
#define GROUP_H
#include<vector>
#include<string>
#include "groupuser.hpp"
using namespace std;
//AllGroup表的ORM类但也不完全是还加了储存组用户的数组
class Group{
public:
    Group(int id=-1,string name ="",string desc=""){
        this->id=id;
        this->name=name;
        this->desc=desc;
    }
    void setId(int id){
        this->id=id;
    }
    void setName(string name){
        this->name=name;
    }
    void setDesc(string desc){this->desc=desc;}
    int getId(){
        return this->id;
    }
    string getName(){
        return this->name;
    }
    string getDesc(){
        return this->desc;
    }
    vector<GroupUser> &getUsers() {return this->users;}

private:
    int id;//组id
    string name;//组名
    string desc;//组功能描述
    vector<GroupUser> users;//组员的详细信息
};
#endif
```

Group类对象是AllGroup表的ORM类，但也不完全，这个类还添加了存储组成员详细信息的结构vector<GroupUser> users;

因为这两张表的关联系很大，所以我们第一这个群组业务的数据操作接口。

groupmodel.hpp

```c++
#ifndef GROUPMODEL_H
#define GROUPMODEL_H
#include "group.hpp"
#include<string>
#include<vector>
using namespace std;
//维护群组信息的操作接口方法
class GroupModel{
public:
    //创建群组
    bool createGroup(Group &group);
    //加入群组
    void addGroup(int userid,int groupid,string role);
    //查询用户所在群组消息
    vector<Group> queryGroups(int userid);
    //根据指定的groupid查询群组用户id列表，除userid自己，主要用户群聊业务给群组其他成员群发消息。
    vector<int> queryGroupUsers(int userid,int groupid);
};
#endif
```

对应函数实现

创建群组createGroup函数：

```c++
// 创建群组
bool GroupModel::createGroup(Group &group){
    //1.组装sql语句
    char sql[1024]={0};
    sprintf(sql,"insert into AllGroup(groupname,groupdesc) values('%s','%s')",group.getName().c_str(),group.getDesc().c_str());
    MySQL mysql;
    if(mysql.connect()){
        if(mysql.update(sql)){
            group.setId(mysql_insert_id(mysql.getConnection()));
            return true;
        }
    }
    return false;
}
```

将组名和组介绍存到AllGroup表中。

加入群组addGroup函数：

```c++
// 加入群组
void GroupModel::addGroup(int userid, int groupid, string role){
    //1.组装sql语句
    char sql[1024]={0};
    sprintf(sql,"insert into GroupUser values(%d,%d,'%s')",groupid,userid,role.c_str());
    MySQL mysql;
    if(mysql.connect()){
       mysql.update(sql);
    }
}
```

// 查询用户所在群组信息queryGroups

```c++
// 查询用户所在群组消息
vector<Group> GroupModel::queryGroups(int userid){
    // 1.先根据userid在GroupUser表中查询该用户所属的群组消息
    // 2.再根据群组消息，查询属于该群组的所有用户的userid,并且和User表进行多表联合查询，查出用户的详细信息
    char sql[1024]={0};
    sprintf(sql,"select a.id,a.groupname,a.groupdesc from AllGroup a inner join GroupUser b on a.id=b.groupid where b.userid=%d",userid);
    vector<Group> groupVec;
    MySQL mysql;
    if(mysql.connect()){
        MYSQL_RES *res=mysql.query(sql);
        if(res!=nullptr){
            MYSQL_ROW row;
            //查出userid所有的群组消息
            while((row=mysql_fetch_row(res))!=nullptr){
                Group group;
                group.setId(atoi(row[0]));
                group.setName(row[1]);
                group.setDesc(row[2]);
                groupVec.push_back(group);
            }
            mysql_free_result(res);
        }
    }
    //查询群组的用户信息
    for(Group &group:groupVec){
        sprintf(sql,"select a.id,a.name,a.state,b.grouprole from User a inner join GroupUser b on b.userid=a.id where b.groupid=%d",group.getId());
        MYSQL_RES *res=mysql.query(sql);
        if(res!=nullptr){
            MYSQL_ROW row;
            while((row=mysql_fetch_row(res))!=nullptr){
                GroupUser user;
                user.setId(atoi(row[0]));
                user.setName(row[1]);
                user.setState(row[2]);
                user.setRole(row[3]);
                group.getUsers().push_back(user);
            }
            mysql_free_result(res);
        }
    }
    return groupVec;
}
```

根据指定的groupid查询群组用户id列表，除userid自己。queryGroupUsers函数：

```c++
// 根据指定的groupid查询群组用户id列表，除userid自己，主要用户群聊业务给群组其他成员群发消息。
vector<int> GroupModel::queryGroupUsers(int userid, int groupid){
    char sql[1024]={0};
    sprintf(sql,"select userid from GroupUser where groupid=%d and userid!=%d",groupid,userid);
    vector<int> idVec;
    MySQL mysql;
    if(mysql.connect()){
        MYSQL_RES *res=mysql.query(sql);
        if(res!=nullptr){
            MYSQL_ROW row;
            while((row=mysql_fetch_row(res))!=nullptr){
                idVec.push_back(atoi(row[0]));
            }
            mysql_free_result(res);
        }
    }
    return idVec;
}
```

完成这些在业务类使用这些功能

首先在public.hpp更新消息类型：

```c++
CREATE_GROUP_MSG,//创建群组
    ADD_GROUP_MSG,//加入群组
    GROUP_CHAT_MSG,//群聊天
```

在业务类ChatService中添加对应的数据操作类对象：

```c++
GroupModel _groupModel;
```

加入功能实现函数：

```c++
//创建群组业务
    void createGroup(const TcpConnectionPtr &conn,json &js,Timestamp);
    //加入群组业务
    void addGroup(const TcpConnectionPtr &conn,json &js,Timestamp);
    //群组聊天业务
    void groupChat(const TcpConnectionPtr &conn,json &js,Timestamp);
```

创建群组业务:

```c++
//创建群组业务
void ChatService::createGroup(const TcpConnectionPtr &conn,json &js,Timestamp){
    int userid=js["id"];
    string name=js["groupname"];
    string desc=js["groupdesc"];
    //存储新创建的群组消息
    Group group(-1,name,desc);
    if(_groupModel.createGroup(group)){
        //存储群组创建人消息
        _groupModel.addGroup(userid,group.getId(),"creator");
    }
}
```

加入群组业务:

```c++
//加入群组业务
void ChatService::addGroup(const TcpConnectionPtr &conn,json &js,Timestamp){
    int userid=js["id"];
    int groupid=js["groupid"];
    _groupModel.addGroup(userid,groupid,"normal");
}
```

群组聊天业务:

```c++
//群组聊天业务
void ChatService::groupChat(const TcpConnectionPtr &conn,json &js,Timestamp){
    int userid=js["id"];
    int groupid=js["groupid"];
    vector<int> useridVec=_groupModel.queryGroupUsers(userid,groupid);
    lock_guard<mutex> lock(_connMutex);
    for(int id:useridVec){
        
        auto it=_userConnMap.find(id);
        if(it!=_userConnMap.end()){
            //转发群消息
            it->second->send(js.dump());
        }else{
            //存储离线群消息
            _offlineMsgModel.insert(id,js.dump());
        }
    }
}
```

还要在构造函数绑定消息对应函数：

```c++
//群组业务注册
    _msgHandlerMap.insert({CREATE_GROUP_MSG,std::bind(&ChatService::createGroup,this,_1,_2,_3)});
    _msgHandlerMap.insert({ADD_GROUP_MSG,std::bind(&ChatService::addGroup,this,_1,_2,_3)});
    _msgHandlerMap.insert({GROUP_CHAT_MSG,std::bind(&ChatService::groupChat,this,_1,_2,_3)});
```

当然在用户登录成功时，还要把群组的信息发给客户端。

```c++
//查询用户的群组信息
            vector<Group> groupuserVec=_groupModel.queryGroups(id);
            if(!groupuserVec.empty()){
                //group:[{groupid:[xxx,xxx,xxx,xxx]}]
                vector<string> groupV;
                for(Group &group:groupuserVec){
                    json grpjson;
                    grpjson["id"]=group.getId();
                    grpjson["groupname"]=group.getName();
                    grpjson["groupdesc"]=group.getDesc();
                    vector<string> userV;
                    for(GroupUser &user:group.getUsers()){
                        json js;
                        js["id"]=user.getId();
                        js["name"]=user.getName();
                        js["state"]=user.getState();
                        js["role"]=user.getRole();
                        userV.push_back(js.dump());
                    }
                    grpjson["users"]=userV;
                    groupV.push_back(grpjson.dump());
                }
                response["groups"]=groupV;
            }
```

群组业务就完成了。

### 客户端开发-首页面开发

首先在src/client编写CMakeLists.txt和main.cpp

CMakeLists.txt

```cmake
#定义了一个SRC_LIST变量，包含了该目录下所有的源文件
aux_source_directory(. SRC_LIST)


#指定生成可执行文件
add_executable(ChatClient ${SRC_LIST})
#指定可执行文件链接时所需要依赖的库文件
target_link_libraries(ChatClient pthread)
```

main.cpp编写我们的客户端程序

首先保存的变量

```c++
//记录当前系统登录的用户信息
User g_currentUser;
//记录当前登录用户的好友列表信息
vector<User> g_currentUserFriendList;
//记录当前登录用户的群组列表信息
vector<Group> g_currentUserGroupList;
```

目前的函数

```c++
//显示当前登录成功用户的基本信息
void showCurrentUserData();
//接受线程
void readTaskHandler(int clientfd);
//获取系统时间(聊天信息需要添加时间信息)
string getCurrentTime();
//主聊天页面程序
void mainMenu();
```

主线程main函数

int main(int argc,char **argv) 

参数说明：

- `int argc`：Argument Count，命令行参数的数量（包括程序本身的名称）。
- `char **argv`：Argument Vector，命令行参数的数组。`argv[0]` 是程序的名字，`argv[1]` 到 `argv[argc-1]` 是你在命令行中输入的其他参数。

在命令行运行./ChatClient 127.0.0.1 6000即可运行

#### 客户端和服务端的连接

首先客户端和服务端的连接代码：

```c++
    if(argc<3){
        cerr<<"command invalid!example:./ChatClient 127.0.0.1 6000"<<endl;
        exit(-1);//异常退出 exit(0)是正常退出
    }
    //解析通过命令行参数传递的ip和port
    char *ip=argv[1];
    uint16_t port=atoi(argv[2]);
    //创建client端的socket
    int clientfd=socket(AF_INET,SOCK_STREAM,0);
    if(-1==clientfd){
        cerr<<"socket create error"<<endl;
        exit(-1);
    }
    //填写client需要连接的server信息ip+port
    sockaddr_in server;
    memset(&server,0,sizeof(sockaddr_in));
    server.sin_family=AF_INET;
    server.sin_port=htons(port);
    server.sin_addr.s_addr=inet_addr(ip);
    //client和server进行连接
    if(-1==connect(clientfd,(sockaddr *)&server,sizeof(sockaddr_in))){
        cerr <<"connect server error"<<endl;
        close(clientfd);
        exit(-1);
    }
```

对其中的函数解释：

```c++
int clientfd=socket(AF_INET,SOCK_STREAM,0);
```

socket函数功能：创建一个 TCP 套接字（socket）

其中的socket函数

```c++
#include <sys/socket.h>
```

 各个参数含义：

```c++
socket(int domain, int type, int protocol)
```

1. `AF_INET`（地址族）

- 指定使用 **IPv4** 地址（Internet Protocol version 4）。
- 如果是 `AF_INET6`，那就是 IPv6。

2. `SOCK_STREAM`（套接字类型）

- 表示使用的是 **面向连接的、可靠的、基于字节流** 的通信方式。
- 通常对应 **TCP** 协议。

3. `0`（协议编号）

- 填 `0` 表示让系统根据前两个参数自动选择合适的协议。
- 对于 `AF_INET + SOCK_STREAM`，系统会自动选择 **TCP** 协议。

返回值：

- 成功时返回一个非负整数（**文件描述符**，也就是 `clientfd`），用于后续的读写操作。
- 失败时返回 `-1`，常见原因包括：系统资源耗尽、参数错误等。

```c++
sockaddr_in server;
```

`sockaddr_in` 是 C/C++ 中专门用来表示 **IPv4 网络地址** 的结构体。

对应的头文件：

```c++
#include <netinet/in.h>
```

```c++
memset(&server,0,sizeof(sockaddr_in));
```

把 `server` 结构体从首地址开始，连续 `sizeof(server)` 个字节都设置为 `0`。

memset函数用法

```c++
void *memset(void *ptr, int value, size_t num);
```

 参数说明：

| 参数    | 说明                                          |
| ------- | --------------------------------------------- |
| `ptr`   | 指向要被设置的内存的指针                      |
| `value` | 要设置的值（会被转换为 `unsigned char` 类型） |
| `num`   | 要设置的字节数                                |

```c++
server.sin_family=AF_INET;
server.sin_port=htons(port);
server.sin_addr.s_addr=inet_addr(ip);
```

```c++
server.sin_family = AF_INET;
```

- 表示使用的地址类型是 **IPv4**。
- `AF_INET` 是 **Address Family Internet** 的缩写。
- 这是 `sockaddr_in` 中的 `sin_family` 字段，必须设置为 `AF_INET`，否则系统无法识别地址格式。

```c++
server.sin_port = htons(port);
```

- 设置端口号，例如：6000。
- `htons()` 是 **Host to Network Short** 的缩写：h
  - 它把本地主机的字节序（可能是小端）转换为网络字节序（大端）。
  - 因为 TCP/IP 协议使用大端字节序进行数据传输。
- `port` 是你从命令行传进来的端口号字符串转成的整数。

htons函数头文件：

```c++
#include <netinet/in.h>
```

 端口必须转换成网络字节序，否则客户端连接服务器时会出错！

```c++
server.sin_addr.s_addr = inet_addr(ip);
```

- 设置 IP 地址。
- `inet_addr()` 函数把点分十进制的 IP 字符串（如 `"127.0.0.1"`）转换成 32 位的二进制整数。
- 转换后的结果赋值给 `sin_addr.s_addr`，用于 socket 连接。

inet_addr函数头文件：

```c++
#include <arpa/inet.h>
```

```c++
//client和server进行连接
    if(-1==connect(clientfd,(sockaddr *)&server,sizeof(sockaddr_in))){
        cerr <<"connect server error"<<endl;
        close(clientfd);//释放socket资源
        exit(-1);
    }
```

`connect()` 函数详解：

```c++
int connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
```

| 参数      | 说明                                                  |
| --------- | ----------------------------------------------------- |
| `sockfd`  | 用 `socket()` 创建的套接字文件描述符（即 `clientfd`） |
| `addr`    | 服务器地址结构指针（需要强转成 `sockaddr*` 类型）     |
| `addrlen` | `addr` 结构体的大小，通常是 `sizeof(sockaddr_in)`     |

#### 客户端业务实现

首先在一个死循环中实现循环选择：

```c++
 //显示首页面菜单 登录,注册，退出
        cout<<"=================================="<<endl;
        cout<<"1. login"<<endl;
        cout<<"2. register"<<endl;
        cout<<"3. quit"<<endl;
        cout<<"=================================="<<endl;
        cout<< "choice:";
        int choice=0;
        cin>>choice;
        cin.get();//读掉缓冲区残留的回车
```

使用switch语句实现不断选择。

##### 首先登录业务：

```c++
case 1://login业务
            {
                int id=0;
                char pwd[50]={0};
                cout<< "userid:";
                cin>> id;
                cin.get();//读掉缓冲区残留的回车
                cout<<"user password:";
                cin.getline(pwd,50);
                json js;
                js["msgid"]=LOGIN_MSG;
                js["id"]=id;
                js["password"]=pwd;
                string request =js.dump();
                int len=send(clientfd,request.c_str(),strlen(request.c_str())+1,0);
                if(len==-1){
                    cerr<<"send login msg error:"<<request<<endl;
                }else{
                    char buffer[1024]={0};
                    len=recv(clientfd,buffer,1024,0);
                    if(len==-1){
                        cerr <<"recv login response error"<<endl;
                    }else{
                        json responsejs=json::parse(buffer);
                        if(responsejs["errno"]!=0){
                            cerr<<responsejs["errmsg"]<<endl;
                        }
                        else{//登录成功
                            //记录当前用户的id和name
                            g_currentUser.setId(responsejs["id"]);
                            g_currentUser.setName(responsejs["name"]);
                            //记录当前用户的好友列表信息
                            if(responsejs.contains("friends")){//看是否包含friends这个键
                                vector<string> vec=responsejs["friends"];
                                for(string &str:vec){
                                    json js=json::parse(str);
                                    User user;
                                    user.setId(js["id"]);
                                    user.setName(js["name"]);
                                    user.setState(js["state"]);
                                    g_currentUserFriendList.push_back(user);
                                }
                            }
                            //记录当前用户的群组列表信息
                            if(responsejs.contains("groups")){
                                vector<string> vec1=responsejs["groups"];
                                for(string &groupstr:vec1){
                                    json grpjs=json::parse(groupstr);
                                    Group group;
                                    group.setId(grpjs["id"]);
                                    group.setName(grpjs["groupname"]);
                                    group.setDesc(grpjs["groupdesc"]);
                                    vector<string> vec2=grpjs["users"];
                                    for(string &userstr:vec2){
                                        GroupUser user;
                                        json js=json::parse(userstr);
                                        user.setId(js["id"]);
                                        user.setName(js["name"]);
                                        user.setState(js["state"]);
                                        user.setRole(js["role"]);
                                        group.getUsers().push_back(user);
                                    }
                                    g_currentUserGroupList.push_back(group);
                                }
                            }
                            //显示登录用户的基本信息
                            showCurrentUserData();
                            //显示当前用户的离线消息 个人聊天消息或者群组消息
                            if(responsejs.contains("offlinemsg")){
                                vector<string> vec=responsejs["offlinemsg"];
                                for(string &str:vec){
                                    json js=json::parse(str);
                                    //time +[id]+name+"said: "+xxx
                                    cout<<js["time"]<<"["<<js["id"]<<"]"<<js["name"]<<" said "<<js["msg"]<<endl;
                                }
                            }
                            //登录成功，启动接受线程负责接受数据
                            std::thread readTask(readTaskHandler,clientfd);
                            readTask.detach();
                            //进入聊天主菜单页面
                            mainMenu();
                        }
                    }
                }
            }
            break;
```

这里解释一些函数

```c++
int len=send(clientfd,request.c_str(),strlen(request.c_str())+1,0);
```

通过 `send()` 函数将字符串 `request` 的内容发送到套接字 `clientfd` 所代表的对端。

各参数详解：

```c++
send(socket, buffer, length, flags)
```

- `clientfd`：套接字描述符，表示要发送数据的目标。
- `request.c_str()`：将 `std::string` 类型的 `request` 转为 C 风格的字符串（返回 `const char*` 指针）。c++
- `strlen(request.c_str()) + 1`：表示发送的数据长度，`+1` 是为了包括字符串末尾的 `\0`（空字符终止符），这是为了让接收方知道字符串结束。
- `0`：表示不使用额外的标志（默认行为）。

关于返回值：

| 返回值 `len` | 意义说明                                                     |
| ------------ | ------------------------------------------------------------ |
| > 0          | 成功发送了 `len` 字节的数据                                  |
| == 0         | TCP 连接被优雅关闭（几乎不会出现在 `send()`，常出现在 `recv()`） |
| == -1        | 发送失败，需检查 `errno` 查看错误原因                        |

```c++
len=recv(clientfd,buffer,1024,0);
```

**从 `clientfd` 套接字接收最多 1024 字节的数据，存入 `buffer` 缓冲区中**。

各参数详解：

```c++
recv(socket, buffer, length, flags)
```

- `clientfd`：连接的套接字描述符（已连接的对端）。
- `buffer`：用于存放接收数据的内存区域（`char buffer[1024];` 或 `char* buffer = new char[1024];`）。
- `1024`：最多接收 1024 字节（防止缓冲区溢出）。
- `0`：标志位，通常设置为 0（表示默认阻塞接收）。

返回值说明（关键点）：

| 返回值 `len` | 意义说明                                    |
| ------------ | ------------------------------------------- |
| > 0          | 实际接收到的数据字节数（并不一定等于 1024） |
| == 0         | **连接已关闭**（对方调用了 `close()`）      |
| == -1        | **接收失败**，可通过 `errno` 查看错误原因   |

注意recv() 并不会自动在 buffer 的末尾添加 '\0‘

所以我们定义buffer:保证末尾有’\0‘

```c++
char buffer[1024]={0};
```

```c++
//登录成功，启动接受线程负责接受数据
                            std::thread readTask(readTaskHandler,clientfd);
                            readTask.detach();
```

创建了一个**新线程**，并立刻将它**分离（detach）**，用来异步执行函数 `readTaskHandler(clientfd)`。

分析每一行作用：

1. `std::thread readTask(readTaskHandler, clientfd);`

- 创建一个线程对象 `readTask`，该线程会立即开始运行 `readTaskHandler(clientfd)`。
- 通常用于处理客户端请求，比如接收数据、解析消息等。

2. `readTask.detach();`

- 将线程**分离**，让它独立运行。
- **主线程不再管理这个子线程**，也无法调用 `join()` 等待它。
- 线程资源会在线程函数执行完毕后由系统自动回收。

 detach 的 **优点与风险**：

优点：

- 简单，**不阻塞主线程**，不需要显式 `join()`。
- 适合执行时间短、无需主线程等待的任务（比如客户端的消息监听）。

风险：

1. **无法再追踪或管理线程**：你不能再 join 或获取其返回状态。
2. **容易引发悬空引用或资源泄漏问题**：
   - 如果 `readTaskHandler()` 里访问了已经销毁的变量，会崩。
   - 比如使用了传进来的 `clientfd` 后，主线程先关闭了它。
3. **调试困难**：detach 后的线程出错更难排查。

##### 注册业务：

```c++
case 2://register业务
            {
                char name[50]={0};
                char pwd[50]={0};
                cout<< "username:";
                cin.getline(name,50);
                cout<<"user password:";
                cin.getline(pwd,50);

                json js;
                js["msgid"]=REG_MSG;
                js["name"]=name;
                js["password"]=pwd;
                string request=js.dump();
                int len=send(clientfd,request.c_str(),strlen(request.c_str())+1,0);
                if(len==-1){
                    cerr <<"send reg msg error:"<<request<<endl;
                }else{
                    char buffer[1024]={0};
                    len=recv(clientfd,buffer,1024,0);
                    if(len==-1){
                        cerr<<"recv reg response error"<<endl;
                    }else{
                        json responsejs=json::parse(buffer);
                        if(0!=responsejs["errno"]){//注册失败
                            cerr<<name<<"is already exist,register error!"<<endl;
                        }else{//注册成功
                            cout<<name<<"register success,userid is "<<responsejs["id"]<<", do not forget it!"<<endl;
                        }
                    }
                }
            }
            break;
```

##### 退出业务：

```c++
 case 3://quit 业务
            {
                close(clientfd);//释放连接，不要重复关闭
                exit(0);
            }
```

##### 聊天主界面业务：

首先在登录业务实现，登录成功又该何去何从，所以聊天主界面业务，首先在登录业务有几个函数，还没有实现，实现一下：

```c++
//显示登录用户的基本信息
showCurrentUserData();
```

具体实现：

```c++
//显示当前登录成功用户的基本信息
void showCurrentUserData(){
    cout<<"==========================login user=============================="<<endl;
    cout<<"current login user =>id:"<<g_currentUser.getId()<<"name:"<<g_currentUser.getName()<<endl;
    cout<<"-------------------------friend list------------------------------"<<endl;
    if(!g_currentUserFriendList.empty()){
        for(User &user:g_currentUserFriendList){
            cout<<user.getId()<<" "<<user.getName()<<" "<<user.getState() <<endl;
        }
    }
    cout<<"--------------------------group list-------------------------------"<<endl;
    if(!g_currentUserGroupList.empty()){
        for(Group &group:g_currentUserGroupList){
            cout<<group.getId()<<" "<<group.getName()<<" "<<group.getDesc()<<endl;
            for(GroupUser &user:group.getUsers()){
                cout<<user.getId()<<" "<<user.getName()<<" "<<user.getState()<<user.getRole()<<endl;
            }
        }
    }
    cout<<"===================================================================="<<endl;
}
```

```c++
//登录成功，启动接受线程负责接受数据
std::thread readTask(readTaskHandler,clientfd);
readTask.detach();
```

其中readTaskHandler的实现：

```c++
//接受线程
void readTaskHandler(int clientfd){
    for(;;){
        char buffer[1024]={0};
        int len =recv(clientfd,buffer,1024,0);
        if(-1==len||0==len){
            close(clientfd);
            exit(-1);
        }
        //接收ChatServer转发的数据，反序列化生成json数据对象
        json js=json::parse(buffer);
        if(ONE_CHAT_MSG==js["msgid"]){
            cout<<js["time"].get<string>()<<"["<<js["id"]<<"]"<<js["name"].get<string>()<< " said: "<<js["msg"].get<string>()<<endl;
            continue;
        }
    }
}
```

这个函数是用来接受服务端发来的消息的。主线程是发消息的。但是当前就实现了关于一对一聊天的接受消息。

```c++
//进入聊天主菜单页面
 mainMenu(clientfd);
```

进入聊天主菜单页面实现具体的业务：

```c++
//主聊天页面程序
void mainMenu(int clientfd){
    help();

    char buffer[1024]={0};
    for(;;){
        cin.getline(buffer,1024);
        string commandbuf(buffer);
        string command;
        int idx=commandbuf.find(":");
        if(idx==-1){
            command=commandbuf;
        }
        else{
            command=commandbuf.substr(0,idx);
        }
        auto it=commandHandlerMap.find(command);
        if(it==commandHandlerMap.end()){
            cerr<< "invalid input command!"<<endl;
            continue;
        }
        //调用相应命令的事件处理回调，mainMenu对修改封闭，添加新功能不需要修改该函数
        it->second(clientfd,commandbuf.substr(idx+1,commandbuf.size()-idx));//调用命令处理方法
    }
}
```

这个函数实现进入主页面使用对应的指令使用对应的功能。接下来说说其中的变量commandHandlerMap。

```c++
//注册系统支持的客户端命令处理
unordered_map<string,function<void(int,string)>>commandHandlerMap={
    {"help",help},
    {"chat",chat},
    {"addfriend",addfriend},
    {"creategroup",creategroup},
    {"addgroup",addgroup},
    {"groupchat",groupchat},
    {"loginout",loginout}
};
```

通过哈希表绑定对应的字符串和对应函数的实现。

当然在实现这些功能时得要有一个文字说明，这就是help功能。

```c++
//"help" command handler
void help(int fd,string str){
    cout<< "show command lists:"<<endl;
    for(auto&p:commandMap){
        cout<<p.first<<" : "<<p.second<<endl;
    }
    cout<<endl;
}

```

这有个细节，因为后续用户如果还想要再次使用help功能，所以把他放在commandHandlerMap中，但是help()函数不满足function<void(int,string)>,所以我们在声明的时候赋初始值，这样就可以直接help()实现了。在其中commandMap也是自己定义提示用户如何使用这些功能。

```c++
//系统支持的客户端命令列表
unordered_map<string,string> commandMap={
    {"help","显示所有支持的命令，格式help"},
    {"chat","一对一聊天，格式chat:friendid:message"},
    {"addfriend","添加好友，格式addfriend:friendid"},
    {"creategroup","创建群组，格式creategroup:groupname:groupdesc"},
    {"addgroup","加入群组，格式addgroup:groupid"},
    {"groupchat","群聊，格式groupchat:groupid:message"},
    {"loginout","注销，格式loginout"}
};
```

由commandHandlerMap知道要实现的功能。

```c++
//调用相应命令的事件处理回调，mainMenu对修改封闭，添加新功能不需要修改该函数
it->second(clientfd,commandbuf.substr(idx+1,commandbuf.size()-idx));//调用命令处理方法
```

这样就可以把具体实现的内容封装到每一个函数中，所以接下来聚集每个实现的函数。

###### chat功能实现：

```c++
//"chat" command handler
void chat(int clientfd,string str){
    int idx=str.find(":");//friendid:message
    if(idx==-1){
        cerr<<"chat command invalid!"<<endl;
        return;
    }
    int friendid=atoi(str.substr(0,idx).c_str());
    string message=str.substr(idx+1,str.size()-idx);
    json js;
    js["msgid"]=ONE_CHAT_MSG;
    js["id"]=g_currentUser.getId();
    js["name"]=g_currentUser.getName();
    js["msg"] = message;
    js["toid"]=friendid;
    js["time"]=getCurrentTime();
    string buffer=js.dump();
    int len=send(clientfd,buffer.c_str(),strlen(buffer.c_str())+1,0);
    if(len==-1){
        cerr<<"send chat msg error:"<<buffer<<endl;
    }

}
```

还要实现getCurrentTime函数：

```c++
//获取系统时间(聊天信息需要添加时间信息)
string getCurrentTime(){
    auto tt = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    struct tm *ptm = localtime(&tt);
    char date[60] = {0};
    sprintf(date, "%d-%02d-%02d %02d:%02d:%02d",
            (int)ptm->tm_year + 1900, (int)ptm->tm_mon + 1, (int)ptm->tm_mday,
            (int)ptm->tm_hour, (int)ptm->tm_min, (int)ptm->tm_sec);
    return std::string(date);
}
```

###### addfriend功能实现：

```c++
//"addfriend" command handler
void addfriend(int clienfd,string str){
    int friendid=atoi(str.c_str());
    json js;
    js["msgid"]=ADD_FRIEND_MSG;
    js["id"]=g_currentUser.getId();
    js["friendid"]=friendid;
    string buffer=js.dump();
    int len=send(clienfd,buffer.c_str(),strlen(buffer.c_str())+1,0);
    if(len==-1){
        cerr<<"send addfriend msg error->"<<buffer<<endl;
    }
}
```

###### creategroup功能实现：

```c++
//"creategroup" command handler
void creategroup(int clientfd, string str)
{
    int idx = str.find(":");
    if (idx == -1)
    {
        cerr << "creategroup command invalid!" << endl;
        return;
    }
    string groupname = str.substr(0, idx);
    string groupdesc = str.substr(idx + 1, str.size() - idx);
    json js;
    js["msgid"] = CREATE_GROUP_MSG;
    js["id"] = g_currentUser.getId();
    js["groupname"] = groupname;
    js["groupdesc"] = groupdesc;
    string buffer = js.dump();
    int len = send(clientfd, buffer.c_str(), strlen(buffer.c_str()) + 1, 0);
    if (len == -1)
    {
        cerr << "send creategroup msg error:" << buffer << endl;
    }
}
```

###### addgroup功能实现：

```c++
//"addgroup" command handler
void addgroup(int clientfd, string str)
{
    int groupid = atoi(str.c_str());
    json js;
    js["msgid"] = ADD_GROUP_MSG;
    js["id"] = g_currentUser.getId();
    js["groupid"] = groupid;
    string buffer = js.dump();
    int len = send(clientfd, buffer.c_str(), strlen(buffer.c_str()) + 1, 0);
    if (len == -1)
    {
        cerr << "send addgroup msg error:" << buffer << endl;
    }
}
```

###### groupchat功能实现：

```c++
//"groupchat" command handler
void groupchat(int clientfd, string str)
{
    int idx = str.find(":");
    if (idx == -1)
    {
        cerr << "groupchat command invalid!" << endl;
        return;
    }
    int groupid = atoi(str.substr(0, idx).c_str());
    string message = str.substr(idx + 1, str.size() - idx);
    json js;
    js["msgid"] = GROUP_CHAT_MSG;
    js["id"] = g_currentUser.getId();
    js["name"] = g_currentUser.getName();
    js["groupid"] = groupid;
    js["msg"] = message;
    js["time"] = getCurrentTime();
    string buffer = js.dump();
    int len = send(clientfd, buffer.c_str(), strlen(buffer.c_str()) + 1, 0);
    if (len == -1)
    {
        cerr << "send groupchat msg error:" << buffer << endl;
    }
}
```

实现群聊功能后，需要在接受线程实现解析返回的信息，并且输出。服务端在这里是直接将消息转发。所以如下实现：

```c++
if (GROUP_CHAT_MSG == msgtype)
{
	cout << "群消息[" << js["groupid"] << "]:" << js["time"].get<string>() << "[" << js["id"] << "]" << 		js["name"].get<string>() << " said: " << js["msg"].get<string>() << endl;
            continue;
 }
```

当然离线消息同时也要输出群组消息.

```c++
if (ONE_CHAT_MSG == js["msgid"].get<int>())
                                {
                                    cout << js["time"].get<string>() << "[" << js["id"] << "]" << js["name"].get<string>() << " said: " << js["msg"].get<string>() << endl;
                                }else{
                                    cout << "群消息[" << js["groupid"] << "]:" << js["time"].get<string>() << "[" << js["id"] << "]" << js["name"].get<string>() << " said: " << js["msg"].get<string>() << endl;
                                }
```

else部分即为离线群组消息。

###### loginout功能实现：

```c++
//"login out" command handler
void loginout(int clientfd, string str)
{
    json js;
    js["msgid"]=LOGINOUT_MSG;
    js["id"]=g_currentUser.getId();
    string buffer=js.dump();
    int len=send(clientfd,buffer.c_str(),strlen(buffer.c_str())+1,0);
    if(len==-1){
        cerr<<"send loginout msg error:"<<buffer<<endl;
    }else{
        isMainMenuRunning=false;
    }

}
```

首先这个函数实现需要在public.hpp

```c++
LOGINOUT_MSG,//注销消息
```

在服务器端做出对应的函数：（记得在构造函数注册注销业务）

```c++
//处理注销业务
void ChatService::loginout(const TcpConnectionPtr &conn,json &js,Timestamp){
    int userid=js["id"];
    {
        lock_guard<mutex> lock(_connMutex);
        auto it=_userConnMap.find(userid);
        if(it!=_userConnMap.end()){
            _userConnMap.erase(it);
        }
    }
    //更新用户的状态信息
    User user(userid,"","","offline");
    _userModel.updateState(user);

}
```

将_userConnMap对应的id的连接删去，并且更新用户的状态。

isMainMenuRunning是一个全局变量，用来确保loginout后会回到首页。所以默认值为false。当进入主菜单界面时，变为true。这样mainMenu函数就会退出循环，运行结束，进入首页的循环。

当然这里就出现了一个问题就是loginoutr退出但是程序没有退出，很多全局变量还保留着上一次的值，这就会在输出这些变量时会把上一次登录的用户信息都输出。所以在登录成功时，记得将对应变量初始化清空，再进行赋值。

```c++
// 记录当前登录用户的好友列表信息
vector<User> g_currentUserFriendList;
// 记录当前登录用户的群组列表信息
vector<Group> g_currentUserGroupList;
```

这两个变量在登录成功后，会进行赋值，记得在赋值前，初始化，清空。

这里还有一个问题，每次登录成功都会创造一个线程，当我在loginout后再次登录，又创造了一个新线程。所以要保证只有一个线程实现接受。所以在登录成功部分修改：

```c++
 // 登录成功，启动接受线程负责接受数据 ,该线程只启动一次
static int readthreadnumber=0;
if(readthreadnumber==0){
	std::thread readTask(readTaskHandler, clientfd); // 在Linux pthread_create
	readTask.detach();
	readthreadnumber++;                               // Linux pthread_detach
}
```

### 引入负载均衡器：

以上我们基本完成了客户端和服务端的开发，由于是一个聊天服务器，要考虑一台服务器同时可以多少用户在线。我借用muduo模型创建 1个主线程（accept连接）+ 4个子线程（处理连接和事件）总共 5个线程，用于服务端 I/O。主线程用于 accept 新连接4 个 `EventLoop` 子线程处理客户端连接的 I/O 事件（读写、消息分发等）

```c++
//设置线程数量
_server.setThreadNum(4);
```

#### **操作系统的限制**

操作系统对单个进程的文件描述符数量有限制，每个客户端连接通常占用一个文件描述符（socket）。

- **Linux默认值**（可以用 `ulimit -n` 查看）：通常是 **1024**，也就是说一个进程默认最多只能同时处理约1000个客户端连接。

#### 实际可支持的并发连接数（估算）：

| 类型                     | 数量                                        |
| ------------------------ | ------------------------------------------- |
| Idle连接（不活跃）       | 40,000 ~ 100,000（受内核和 FD 限制）        |
| 活跃连接（频繁收发消息） | 10,000 ~ 20,000（实际取决于业务逻辑复杂度） |

这是**单进程、多线程、epoll** 架构下的典型并发能力，非常高效。

#### 什么是 **Idle连接（不活跃连接）**？

**Idle（空闲）连接** 是指：

客户端虽然 **已经建立了连接**，但 **长时间没有发送或接收任何数据**，也就是说：

- **连接处于打开状态（TCP连接存在）**
- 但没有发生 **读写事件**
- 占用资源极少（仅占用文件描述符、少量内存）

#### 为什么要区分 Idle 与 活跃连接？

1. **资源占用不同**

- Idle 连接不产生消息，不触发回调，服务器处理负担极低
- 活跃连接需要处理消息、业务逻辑，负担高

2. **并发能力的评估**

- 很多高并发服务器说能支持“10万连接”，指的是 **Idle连接数量**
- 真正活跃（消息频繁）的连接，一般几千~上万就会达到服务器上限

3. **是否需要清理 Idle连接**

- 有些服务器会设置 **心跳/超时机制**，长时间不活跃的连接会被断开，防止资源泄漏或恶意占用

我们还要提高并发量，就要引入**负载均衡器**的概念。

#### 负载均衡器

**负载均衡器（Load Balancer）** 是一个把大量客户端请求 **均匀分发** 给多个后端服务器的组件，以提高系统的 **吞吐能力、稳定性和可用性**。

#####  为什么需要它？

在高并发系统中，如果所有请求都打到一个服务器上，容易导致：

- 响应慢
- 连接超时
- 服务宕机

使用负载均衡器可以：

- **水平扩展**服务器（多个 Muduo 实例）
- **分担压力**
- 实现高可用（某个服务器挂了不影响整体）

##### 按协议层划分（TCP/HTTP）

| 类型                   | 层级        | 说明                     | 常用代表                               |
| ---------------------- | ----------- | ------------------------ | -------------------------------------- |
| **四层负载均衡（L4）** | TCP/UDP     | 基于 IP、端口、协议      | LVS、HAProxy、Nginx Stream、Keepalived |
| **七层负载均衡（L7）** | HTTP、HTTPS | 基于 URL、Header、Cookie | Nginx、HAProxy、Traefik、Envoy、Kong   |

#####  常见软件负载均衡器对比

| 名称           | 协议支持       | 类型       | 特点                                    | 场景                      |
| -------------- | -------------- | ---------- | --------------------------------------- | ------------------------- |
| **LVS**        | L4 (TCP/UDP)   | 内核模块   | 性能极高、稳定、复杂配置                | 超高并发、基础设施层      |
| **HAProxy**    | L4 + L7        | 用户态     | 灵活、高性能、支持健康检查、监控完备    | Web、API 网关、数据库代理 |
| **Nginx**      | L7 (也支持 L4) | 用户态     | 配置简单，静态资源支持好                | Web服务器、轻量级反代     |
| **Traefik**    | L7             | 云原生     | 自动发现服务（K8s、Docker）、面向微服务 | DevOps、容器化            |
| **Envoy**      | L4 + L7        | 云原生     | 微服务架构核心组件、支持 gRPC、动态配置 | Istio、Service Mesh       |
| **Kong**       | L7 API网关     | 插件丰富   | 基于 Nginx，提供限流、安全等扩展能力    | 企业 API 管理             |
| **Keepalived** | L4             | 高可用     | 常与 LVS 配合，提供主备切换             | 双主结构、高可用架构      |
| **OpenResty**  | L7             | 基于 Nginx | 支持 Lua，适合做复杂业务逻辑            | 高定制需求                |
| **Caddy**      | L7             | 自动 TLS   | HTTPS 自动配置简单                      | 个人、低门槛网站部署      |

我们这里要使用的是Nginx 的 TCP 负载均衡模块（即 stream 模块）

![2](c-实现集群聊天服务器/2.png)

这是负载均衡器在本项目发挥的作用图。

Nginx 默认是 HTTP 层负载均衡（七层），但它的 **`stream` 模块** 支持四层（TCP/UDP）负载均衡，非常适合。

说白了，通过多台后台服务器提高并发量。但也面临着如何处理跨服务器通信的问题。

### 引入服务器中间件（redis）

**Redis（Remote Dictionary Server）** 是一个**开源**的、基于内存的**键值对存储（Key-Value Store）数据库**，支持丰富的数据结构，**读写极快**，非常适合用作缓存、中间件、消息队列等。

引入redis是要解决如果一个用户要和另一个用户通信，但是另一个用户在另一台服务器上，我们能从数据库中看到他在线，但是我们不能获取他的连接，所以引入中间件。这样就可以解决跨服务器通信的问题。

这里是redis在本项目的作用图：

![3](c-实现集群聊天服务器/3.png)

### nginx项目配置

nginx配置编译好后，去修改/usr/local/nginx/conf中修改nginx.conf文件。

```bash
#nginx tcp loadbalance config
stream {
        upstream MyServer {
                server 127.0.0.1:6000 weight=1 max_fails=3 fail_timeout=30s;
                server 127.0.0.1:6002 weight=1 max_fails=3 fail_timeout=30s;
        }

        server {
                proxy_connect_timeout 1s;
                #proxy_timeout 3s; # 可以根据需要开启，控制代理的读写超时
                listen 8000;
                proxy_pass MyServer;
                tcp_nodelay on;
        }       
}

```

在events和http领域之间加入上述代码。这一段代码就是加入**`stream` 模块** 。

说明

- **stream{}**：用于 TCP/UDP 负载均衡。
- **upstream MyServer**：定义了两个后端服务器，权重相等。
- **max_fails=3 fail_timeout=30s**：3次失败后，30秒内认为该节点不可用。
- **listen 8000**：监听本机 8000 端口。
- **proxy_connect_timeout 1s**：连接超时时间为1秒。
- **proxy_pass MyServer**：请求转发到 MyServer 负载均衡组。
- **tcp_nodelay on**：开启 TCP_NODELAY，减少延迟。

这样就实现了多个客户端只需要向一个ip+port就可以。通过nginx对多台服务器管理，这样就增加了聊天服务器的并发量。当然跨服务器通信这一问题还没有解决。

### Redis项目配置

首先在include和src建立redis文件夹，在对应的文件夹添加redis.hpp和redis.cpp。记得更新CMakeLists.txt文件。这里调用了hiredis库。hiredis是c++使用redis封装的库。

redis.hpp

```c++
#ifndef REDIS_H
#define REDIS_H
#include <hiredis/hiredis.h>
#include <thread>
#include <functional>
using namespace std;
class Redis{
    public:
        Redis();
        ~Redis();

        //连接redis服务器
        bool connect();
        //向redis指定的通道channel发布消息
        bool publish(int channel,string message);
        //向redis指定的通道subscribe订阅消息
        bool subscribe(int channel);
        //向redis指定的通道unsubscribe取消订阅消息
        bool unsubscribe(int channel);
        //在独立线程中接受订阅通道中的消息
        void observer_channel_message();
        //初始化向业务层上报通道消息的回调对象
        void init_notify_handler(function<void(int,string)> fn);
    private:
        //hiredis同步上下文对象，负责publish消息
        redisContext *_publish_context;
        //hiredis同步上下文对象，负责subscribe消息
        redisContext * _subscribe_context;
        //回调操作，收到订阅的消息，给service层上报
        function<void (int,string)> _notify_message_handler;
};
#endif
```

redis.cpp

```c++
#include"redis.hpp"
#include<iostream>
using namespace std;
Redis::Redis():_publish_context(nullptr),_subscribe_context(nullptr){

}
Redis::~Redis(){
    if(_publish_context!=nullptr){
        redisFree(_publish_context);
    }
    if(_subscribe_context!=nullptr){
        redisFree(_subscribe_context);
    }
}
bool Redis::connect(){
    //负责publish发布消息的上下文连接
    _publish_context=redisConnect("127.0.0.1",6379);
    if(_publish_context==nullptr){
        cerr<< "connect redis failed!"<<endl;
        return false;
    }
    //负责subscribe订阅消息的上下文连接
    _subscribe_context=redisConnect("127.0.0.1",6379);
    if(_subscribe_context==nullptr){
        cerr<< "connect redis failed!"<<endl;
        return false;
    }
    //在单独的线程中，监听通道上的事件，有消息给业务层进行上报
    thread t([&](){
        observer_channel_message();
    });
    t.detach();
    cout<<"connect redis_server success!"<<endl;

    return true;
}
//向redis指定的通道channel发布消息
bool Redis::publish(int channel,string message){
    redisReply *reply=(redisReply*)redisCommand(_publish_context,"PUBLISH %d %s",channel,message.c_str());
    if(reply==nullptr){
        cerr<<"publish command failed"<<endl;
        return false;
    }
    freeReplyObject(reply);
    return true;
}
//向redis指定的通道subscribe订阅消息
bool Redis::subscribe(int channel){
    //subscribe命令本身会造成线程阻塞等待通道里面发生消息，这里只做订阅通道，不接受消息
    //通道消息的接受专门在observer_channel_message函数中的独立线程中进行
    //只负责发送命令，不阻塞接受redis server响应消息，否则和notifyMsg线程抢占响应资源。
    if(REDIS_ERR==redisAppendCommand(this->_subscribe_context,"SUBSCRIBE %d",channel)){
        cerr<<"subscribe command failed!"<<endl;
        return false;
    }
    //redisBufferWrite 可以循环发送缓冲区，直到缓冲区数据发送完毕（done被置为1）
    int done=0;
    while(!done){
        if(REDIS_ERR==redisBufferWrite(this->_subscribe_context,&done)){
            cerr<<"subscribe command failed!"<<endl;
            return false;
        }
    }
    //redisGetReply不执行
    return true;

}
//向redis指定的通道unsubscribe取消订阅消息
bool Redis::unsubscribe(int channel){
    if(REDIS_ERR==redisAppendCommand(this->_subscribe_context,"UNSUBSCRIBE %d",channel)){
        cerr<<"unsubscribe command failed!"<<endl;
        return false;
    }
    //redisBufferWrite 可以循环发送缓冲区，直到缓冲区数据发送完毕（done被置为1）
    int done=0;
    while(!done){
        if(REDIS_ERR==redisBufferWrite(this->_subscribe_context,&done)){
            cerr<<"unsubscribe command failed!"<<endl;
            return false;
        }
    }
    return true;
}
//在独立线程中接受订阅通道中的消息
void Redis::observer_channel_message(){
    redisReply *reply=nullptr;
    while(REDIS_OK==redisGetReply(this->_subscribe_context,(void**)&reply)){
        //订阅收到的消息是一个带三元组的数组
        if(reply!=nullptr&&reply->element[2]!=nullptr&&reply->element[2]->str!=nullptr){
            //给业务层上报通道上发生的消息
            _notify_message_handler(atoi(reply->element[1]->str),reply->element[2]->str);
        }
        freeReplyObject(reply);
    }
    cerr<<">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>observer_channel_message quit <<<<<<<<<<<<<<<<<<<<<<<<<<<"<<endl;
}
//初始化向业务层上报通道消息的回调对象
void Redis::init_notify_handler(function<void(int,string)> fn){
    this->_notify_message_handler=fn;
}
```

这里需要注意的点就是关于订阅和发布，发布publish直接用redisCommand函数即可，因为这个命令直接执行本身不会堵塞（服务器会很快给出回复）。但是subscribe不一样，他直接执行会卡在那里，一直等待消息进入通道里（服务器不会很快回复）。所以我们这里使用redisAppendCommand` + `redisBufferWrite这两个函数一起，不用再等待响应。所以我们单开一个线程来接受通道里的消息。

总结对比

| 功能     | `redisCommand`      | `redisAppendCommand` + `redisBufferWrite` |
| -------- | ------------------- | ----------------------------------------- |
| 用法     | 直接发送+等待响应   | 仅发送命令到 Redis，不等待响应            |
| 是否阻塞 | 会阻塞直到响应      | 不会阻塞                                  |
| 适用场景 | 普通命令（GET/SET） | 发布订阅等需要后台线程响应的命令          |

所以我们把监听逻辑放到线程里。

注意：

Redis 的订阅-发布机制设计：

- **订阅连接会被阻塞监听消息，不允许执行其他命令。**
- 如果同一个连接既用来订阅又用来发布，订阅时会阻塞导致发布失败或延迟。
- 所以一般建议**发布和订阅使用独立的连接**，保证各自的流畅性和响应效率。

### 解决跨服务器通信问题

我们已经配置好redis,并且封装了对应的redis类。接下来在业务类实现加入redis。

在对应的ChatService类声明私有变量。

```c++
//redis操作对象
 Redis _redis;
```

在ChatService类的构造函数，实现redis连接并且加入回调函数。

```c++
//连接redis服务器
if(_redis.connect()){
	//设置上报消息的回调
	_redis.init_notify_handler(std::bind(&ChatService::handleRedisSubscribeMessage,this,_1,_2));
}
```

handleRedisSubscribeMessage函数是从redis消息队列中获取订阅的消息（在另一个线程执行）

```c++
//从redis消息队列中获取订阅的消息
void ChatService::handleRedisSubscribeMessage(int userid,string msg){
    lock_guard<mutex> lock(_connMutex);
    auto it=_userConnMap.find(userid);
    if(it!=_userConnMap.end()){
        it->second->send(msg);
        return;
    }
    //存储该用户的离线消息
    _offlineMsgModel.insert(userid,msg);
}
```

从redis返回的userid和message是当前服务器订阅的通道返回的消息，所以当前userid一定在当前服务器的_userConnMap中，当然也存在一种情况，发消息给redis时，还在线，redis传给对应的服务器时，该用户下线了，所以也要存储该用户的离线消息。

接着还要在登录功能和注销功能做修改

在登录成功后：

```c++
//id用户登录成功后，向redis订阅channel(id)
_redis.subscribe(id);
```

要向redis订阅消息，有向当前用户发送的消息会向在redis通道存储，之后会向当前用户输送。

在注销（退出）后：

```c++
//用户注销，相当于下线，在redis中取消订阅通道
_redis.unsubscribe(userid);
```

关闭掉订阅通道。当然还有客户端异常退出时，也要关闭订阅

```c++
//客户端关闭，相当于下线，在redis中取消订阅通道
_redis.unsubscribe(user.getId());
```

最后对一对一聊天和群聊功能做修改。

一对一聊天，当查到目标用户没有在_userConnMap中，说明目标用户不在当前服务器上或者不在线，所以接下来去数据库查看目标用户是否在线，若在线，则向redis对应的通道发布消息。不在线则存储连线消息。

```c++
//查询toid是否在线（可能在其他服务器上）
User user=_userModel.query(toid);
if(user.getState()=="online"){
	_redis.publish(toid,js.dump());
	return;
}
```

群聊，当查到目标用户没有在_userConnMap中，说明目标用户不在当前服务器上或者不在线，所以接下来去数据库查看目标用户是否在线，若在线，则向redis对应的通道发布消息。不在线则存储连线消息。

```c++
auto it=_userConnMap.find(id);
if(it!=_userConnMap.end()){
            //转发群消息
            it->second->send(js.dump());
        }else{
            //查询id是否在线
            User user=_userModel.query(id);
            if(user.getState()=="online"){
                _redis.publish(id,js.dump());
            }else{
                //存储离线群消息
                _offlineMsgModel.insert(id,js.dump());
            }
            
        }
```

至此解决跨服务器通信问题。

### 解决登录注销后再次登录会阻塞的问题

在登录后注销退出后，在进行登录会一直卡住，没有关于用户的信息展示和指令展示，核查发现是主线程在执行recv,接受线程也在recv同一个socket,所以这里我们引入

```c++
// 用于读写线程的通信
sem_t rwem;
// 记录登录状态
atomic_bool g_isLoginSuccess{false};
```

`sem_t` 是 POSIX 信号量类型（semaphore），用于线程之间同步或通信。

`tomic_bool` 是 C++ 的原子变量类型之一，用于线程安全地读写布尔值，防止并发条件竞争。

一、信号量 `sem_t` 的初始化

在使用前，**必须初始化**。常用的是 `sem_init`：

```c++
sem_t rwem;
sem_init(&rwem, 0, 0);
```

参数解释：

```c++
int sem_init(sem_t *sem, int pshared, unsigned int value);
```

| 参数        | 说明                           |
| ----------- | ------------------------------ |
| `sem`       | 指向信号量的指针               |
| `pshared=0` | 表示是线程之间使用（同一进程） |
| `value=0`   | 初始值为 0（表示“没有资源”）   |

 通常设为 0，表示线程必须等待 `sem_post()` 才能继续。

二、sem_post 和 sem_wait 的配合逻辑

| 函数              | 含义                                              |
| ----------------- | ------------------------------------------------- |
| `sem_post(&rwem)` | 给信号量加1，表示“有资源了”或“可以继续了”         |
| `sem_wait(&rwem)` | 阻塞等待信号量值>0，然后减1，表示“我来用这个资源” |

总体步骤：

| 步骤             | 函数                     | 示例                 |
| ---------------- | ------------------------ | -------------------- |
| 初始化           | `sem_init(&rwem, 0, 0);` | 启动阶段             |
| 发送信号（通知） | `sem_post(&rwem);`       | 接收线程收到数据时   |
| 等待信号         | `sem_wait(&rwem);`       | 处理线程等待数据     |
| 销毁             | `sem_destroy(&rwem);`    | 程序结束或退出登录时 |

由于登录成功和注册成功的消息的收取是在主线程进行的，其他信息的收取是在另一个进程中，所以我要修改代码，把登录和注册的回复消息由接受进程收取。

首先在客户端main函数中连接服务器端成功后，插入

```c++
// 初始化读写线程通信用的信号量
sem_init(&rwem, 0, 0);

// 连接服务器成功，启动接受线程
std::thread readTask(readTaskHandler, clientfd); // 在Linux pthread_create
readTask.detach();
```

在登录时向服务端发送登录消息后，插入

```c++
sem_wait(&rwem); // 等待信号量，由子线程处理完登录的响应消息后，通知这里
g_isLoginSuccess = false;
```

sem_wait(&rwem); 是为了**接受线程**消息处理好后会sem_post(&rewm)，主线程接受到信号进行往下走。

g_isLoginSuccess时为了确认登录是否成功，如不成功，就进入首页面，成功进主菜单页面。

```c++
if (g_isLoginSuccess)
            {
                // 进入聊天主菜单页面
                isMainMenuRunning = true;
                mainMenu(clientfd);
            }
```

注册就只需要等待信号就可以了

```c++
sem_wait(&rwem); // 等待信号量，由子线程处理完注册的响应消息后，通知这里
```

在退出业务记得把信号回收

```c++
sem_destroy(&rwem);
```

在接受线程里

```c++
if (LOGIN_MSG_ACK == msgtype)
        {
            doLoginResponse(js); // 处理登录响应的业务逻辑
            sem_post(&rwem);     // 通知主线程，登录结果处理完成
            continue;
        }
        if (REG_MSG_ACK == msgtype)
        {
            doRegResponse(js);
            sem_post(&rwem); // 通知主线程，注册结果处理完成
            continue;
        }
```

当收到对应业务的消息，就执行对应逻辑。

```c++
// 处理登录响应的业务
void doLoginResponse(json &responsejs)
{
    if (responsejs["errno"] != 0)
    {
        cerr << responsejs["errmsg"] << endl;
        g_isLoginSuccess = false;
    }
    else
    { // 登录成功
        // 记录当前用户的id和name
        g_currentUser.setId(responsejs["id"]);
        g_currentUser.setName(responsejs["name"]);
        // 记录当前用户的好友列表信息
        if (responsejs.contains("friends"))
        {
            // 初始化
            g_currentUserFriendList.clear();

            // 看是否包含friends这个键
            vector<string> vec = responsejs["friends"];
            for (string &str : vec)
            {
                json js = json::parse(str);
                User user;
                user.setId(js["id"]);
                user.setName(js["name"]);
                user.setState(js["state"]);
                g_currentUserFriendList.push_back(user);
            }
        }
        // 记录当前用户的群组列表信息
        if (responsejs.contains("groups"))
        {
            // 初始化
            g_currentUserGroupList.clear();

            vector<string> vec1 = responsejs["groups"];
            for (string &groupstr : vec1)
            {
                json grpjs = json::parse(groupstr);
                Group group;
                group.setId(grpjs["id"]);
                group.setName(grpjs["groupname"]);
                group.setDesc(grpjs["groupdesc"]);
                vector<string> vec2 = grpjs["users"];
                for (string &userstr : vec2)
                {
                    GroupUser user;
                    json js = json::parse(userstr);
                    user.setId(js["id"]);
                    user.setName(js["name"]);
                    user.setState(js["state"]);
                    user.setRole(js["role"]);
                    group.getUsers().push_back(user);
                }
                g_currentUserGroupList.push_back(group);
            }
        }
        // 显示登录用户的基本信息
        showCurrentUserData();
        // 显示当前用户的离线消息 个人聊天消息或者群组消息
        if (responsejs.contains("offlinemsg"))
        {
            vector<string> vec = responsejs["offlinemsg"];
            for (string &str : vec)
            {
                json js = json::parse(str);
                // time +[id]+name+"said: "+xxx
                if (ONE_CHAT_MSG == js["msgid"].get<int>())
                {
                    cout << js["time"].get<string>() << "[" << js["id"] << "]" << js["name"].get<string>() << " said: " << js["msg"].get<string>() << endl;
                }
                else
                {
                    cout << "群消息[" << js["groupid"] << "]:" << js["time"].get<string>() << "[" << js["id"] << "]" << js["name"].get<string>() << " said: " << js["msg"].get<string>() << endl;
                }
            }
        }
        g_isLoginSuccess = true;
    }
}
```

当然，在登陆成功后记得把g_isLoginSuccess置为true。

```c++
// 处理注册响应的业务
void doRegResponse(json &responsejs)
{
    if (0 != responsejs["errno"])
    { // 注册失败
        cerr <<"name is already exist,register error!" << endl;
    }
    else
    { // 注册成功
        cout <<"name register success,userid is " << responsejs["id"] << ", do not forget it!" << endl;
    }
}
```

这样就把这个问题解决了。
