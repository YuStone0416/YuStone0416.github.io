---
title: Qt学习
tags: Qt
categories: Qt学习
comments: true
excerpt: Qt学习
date: 2025-10-19 14:54:16
updated: 2025-10-19 13:26:16
---

## Qt信号与槽机制原理

信号：信号本质是事件，信号展现方式就是函数。当一个事件发生之后，则发出一个信号(signal )。

槽：对信号响应的函数，槽就是一个函数。槽函数和普通函数的区别：槽函数可以与一个信号关联，

当信号被发射时，关联的槽函数会被自动执行处理。信号和槽关联是使用QObject::connect()函数进行实现。

信号函数只需要声明(不需要定义)，而槽函数需要实现。

每个信号都可以用函数表示，称为信号函数；每个槽也可以用函数表示，称为槽函数

Qt 的信号/槽机制**表面像直接函数调用**，但**底层并不是由编译器静态绑定的普通函数调用**，而是通过 **元对象系统 + 运行时反射 + 事件队列（或者直接函数调用）** 来实现的。

核心流程可以简单理解为：

QObject::connect()

- connect 时不会产生任何函数调用
- Qt 会把 *sender 的信号* → *receiver 的槽函数指针（或元信息）* 存入一个连接表

------

emit 触发信号时

编译器把 `emit someSignal(...)` **直接当作正常函数调用**（就是调用一个隐藏的 `someSignal()` 函数）
 而这个函数内部会调用 Qt 的元对象系统：

```c++
QMetaObject::activate(this, metaobject, signal_index, argv);
```

然后 Qt 会做：

1. 找到这个 signal 对应的所有已连接的槽
2. 根据连接方式（Qt::AutoConnection）
   - **同线程 → 直接调用槽函数（类似调用成员函数）**
   - **跨线程 → 投递事件到对方线程的事件队列中（异步执行）**
3. 最终再调用槽函数

```c++
[static] QMetaObject::Connection QObject::connect(const QObject *sender, const char *signal, const QObject *receiver, const char *method, Qt::ConnectionType type = Qt::AutoConnection);
const QObject *sender:发出信号的对象
const char *signal：sender对象的信号
const QObject *receiver：信号接收者
const char *method：receiver对象的槽函数    
```

### 信号和槽机制连接方式

1. **一个信号可以跟另一个信号相连；**
2. **同一个信号可以跟多个槽相连。**
3. **同一个槽可以响应多个信号。**

### 信号和槽机制优缺点

**一、优势**

1. **松耦合**
   - 信号发送者无需知道谁接收信号
   - 接收者也不用知道信号来自哪里
   - 提升模块化，方便维护和扩展
2. **自动线程安全**
   - Qt 自动检测信号和槽是否跨线程
   - 跨线程时，信号会通过事件队列异步调用槽
   - 减少手动锁和线程同步的复杂性
3. **支持多目标**
   - 一个信号可以连接多个槽
   - 多个组件可以同时响应同一事件
4. **类型安全**
   - Qt5+ 函数指针写法保证编译期类型检查
   - 避免 runtime crash
5. **事件驱动和异步支持**
   - 信号槽机制天然适合 GUI、I/O、网络等异步事件
   - 可以轻松实现 UI 响应、后台任务结果更新
6. **自动管理对象生命周期**
   - QObject 对象销毁时会自动断开其所有信号连接
   - 防止悬垂指针调用槽函数

------

**二、缺点**

1. **性能开销**
   - 信号触发需要查表、函数调用间接层、可能事件队列投递
   - 高频调用场景（如每帧图像处理、底层硬件采样）不适合
2. **调试困难**
   - 信号槽是运行时绑定，错误可能在 connect 时或槽执行时才发现
   - 如果槽抛异常或被多次连接，问题不容易追踪
3. **必须继承 QObject**
   - 信号槽只能在 QObject 子类中使用
   - 对纯数据类、算法类限制多
4. **依赖元对象系统 (MOC)**
   - 需要 Qt 的 moc 编译器预处理 `signals:` / `slots:`
   - 不适合完全脱离 Qt 的项目
5. **跨语言/跨平台限制**
   - 信号槽机制是 Qt 独有，不像标准 C++ 回调可移植
   - 如果想做轻量、纯 C++ 库，依赖 Qt 会增加包大小

## QMap类和QHash类和QVector类

QMap

```c++
#include <QCoreApplication>

#include <QDebug>
int main(int argc, char *argv[])
{
    QCoreApplication a(argc, argv);
    
    //QMap类
    //1：创建Map实例，第一个参数为QString类型的值，第二个参数为int类型的值
    QMap<QString,int> qmap;
    
    //插入数据信息，它有两方式进行操作
    qmap["Chinese"]=119;
    qmap["English"]=120;
    
    qmap.insert("Math",115);
    qmap.insert("physics",99);
    qmap.insert("Chemistry",100);
    qDebug()<<qmap;
    
    //删除数据信息key键
    qmap.remove("Chemistry");
    qDebug()<<qmap;
    
    //遍历QMap类的实例：数据信息
    //1：迭代器
    QMapIterator<QString,int> itr(qmap);
    while(itr.hasNext())
    {
        itr.next();
        qDebug()<<itr.key()<<" "<<itr.value();
    }
    //2：STL类型的迭代
    qDebug();
    QMap<QString,int>::const_iterator stritr=qmap.constBegin();
    while(stritr!=qmap.constEnd())
    {
        qDebug()<<stritr.key()<<" "<<stritr.value();
        stritr++;
    }
    
    //key键/T键--》来查找
    qDebug()<<endl;
    qDebug()<<"key-->T"<<qmap.value("Math");
    qDebug()<<"T-->key"<<qmap.key(99);
    
    //修改键值
    //一个键对应一个值，再次调用insert()函数将覆盖之前的值
    qmap.insert("Math",118);
    qDebug()<<qmap.value("Math");
    
    //查询是否包含某个键
    qDebug()<<"result="<<qmap.contains("Chinese");
    qDebug()<<"result="<<qmap.contains("Chemistry");
    
    //输出所有QMap实例化：Key键和T键值
    qDebug()<<endl;
    QList<QString> akeys=qmap.keys();
    qDebug()<<akeys;
    
    QList<int> aValues=qmap.values();
    qDebug()<<aValues;
    
    //一个键对应多个值
    //直接使用QMultiMap类来实例化一个QMap对象
    qDebug()<<endl;
    QMultiMap<QString,QString> mulmap;
    mulmap.insert("student","no");
    mulmap.insert("student","name");
    mulmap.insert("student","sex");
    mulmap.insert("student","age");
    mulmap.insert("student","hign");
    qDebug()<<mulmap;//mulmap还是一个QMap对象
    return a.exec();
}
```

QHash

```c++
#include <QCoreApplication>

#include <QDebug>
int main(int argc, char *argv[])
{
    QCoreApplication a(argc, argv);

    //QHash类
    QHash<QString,int> qhash;
    qhash["key 1"]=3;
    qhash["key 1"]=8;
    qhash["key 4"]=4;
    qhash["key 2"]=2;
    qhash.insert("key 3",30);
    QList<QString> list=qhash.keys();
    for(int i=0;i<list.length();++i)
    {
        qDebug()<<list[i]<<","<<qhash.value(list[i]);
    }

    //QHash内部的QHashIterator类
    QHash<QString,int> hash;
    hash["key 1"]=33;
    hash["key 2"]=44;
    hash["key 3"]=55;
    hash["key 4"]=66;
    hash.insert("key 3",100);

    QHash<QString,int>::const_iterator iterator;
    for(iterator=hash.begin();iterator!=hash.end();iterator++)
    {
        qDebug()<<iterator.key()<<"--->"<<iterator.value();
    }
    return a.exec();
}

```

