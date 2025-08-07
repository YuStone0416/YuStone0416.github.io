---
title: C++basiclearning
date: 2025-08-03 21:26:16
tags: C++
categories: C++basiclearning
updated: 2025-08-03 21:26:16
---

## 代码底层机制

### 进程虚拟地址空间区域划分

![1](C-basiclearning/1.png)

### 指令角度函数调用堆栈详细过程

![2](C-basiclearning/2.png)

### 编译器角度理解C++代码的编译和链接原理

```bash
objdump -t main.o#查看当前文件的符号表
readelf -h a.out#查看当前文件的很多信息(程序方向的)
```

![3](C-basiclearning/3.png)

**运行可执行文件，操作系统如何操作的**

 前提理解

- **可执行文件**（ELF等）经过链接器处理后，划分为不同的段（`.text`, `.data`, `.bss`, `.rodata`, ...）。
- **32位进程**有**4GB虚拟地址空间**：地址范围是 `0x00000000 ~ 0xFFFFFFFF`。
- **虚拟地址** ≠ **物理地址**，中间通过页表等机制完成**映射**。
- 可执行文件运行时，操作系统通过 `execve` 系统调用把文件加载到进程空间中。

------

加载过程简述

1. **可执行文件被加载**：
   - 内核根据 ELF 文件头，知道每个段该放到虚拟空间的哪个地址。
   - 如 `.text` 放在 `0x08048000`（很多 Linux 默认），`.data` 放在 `0x08049000` 等。
   - 这时还**没真正加载全部内容进内存**，只是建立了**虚拟内存映射**。
2. **虚拟地址空间初始化（页表）**：
   - 虚拟地址空间被分页（Page），每页通常 4KB。
   - 页表记录“虚拟页 -> 物理页”的映射关系。
   - 一开始很多段是通过 `mmap` 映射（如 lazy loading），并**不真正加载数据**。
3. **访问虚拟地址 → 缺页中断**：
   - 当程序第一次访问 `.text` 段的某一地址，CPU查页表发现没有对应的物理页。
   - 触发 **缺页异常（Page Fault）**，操作系统：
     - 找到可执行文件中该段的位置；
     - 把对应部分内容读入内存；
     - 更新页表。
4. **之后访问就命中页表，快速转换**：
   - 虚拟地址 → 通过页表 → 物理地址。
   - 再加上 TLB（快表）缓存页表项，加速访问。

## C++基础

### 形参带默认值的函数

```c++
#include <iostream>
using namespace std;

//形参带默认值的函数
//1.给默认值的时候，从右往左给
//2.调用效率的问题
//3.定义时可以给形参默认值，声明也可以给形参默认值
//4.形参给默认值的时候，不管是定义处给，还是声明处给，形参默认值只能出现一次
int sum(int a, int b = 20);
int sum(int a = 10, int b);//声明出现多次，定义只有一次
int main()
{
    int a = 10;
    int b = 20;
    int ret = sum(a, b);
    /*
    mov eax,dword ptr[ebp-8]
    push eax

    mov ecx,dword ptr[ebp-4];
    push ecx
    call sum

    */
    //如果加了形参默认值
    // int sum(int a, int b = 20);
    //调用sum(10);
    /*
    mov eax,dword ptr[ebp-8]
    push eax

    mov ecx,dword ptr[ebp-4];这句就不会有
    push 0aH
    call sum
    相比不加形参默认值，节省了这条指令。
    */
    std::cout << ret <<"\nHello World!\n";
}
int sum(int a, int b) 
{
    return a + b;
}
```

```bash
30
Hello World!
```

### inline内联函数

```c++
#include <iostream>
using namespace std;
/*
  inline内联函数和普通函数的区别？
  inline内联函数：在编译过程中，就没有函数的调用开销了，在函数的调用点
  直接把函数的代码进行展开处理了

  inline函数不再生成相应的函数符号
  但是，不是所有的inline都会被编译器处理成内联函数 - 递归
  inline标识符只是建议编译器把这个函数处理成内联函数。
  如果inline函数体内的代码过多，可能会出错，编译器可能不会内联。
  毕竟直接在函数的调用点展开，很有可能出错。

  debug版本上，inline是不起作用的；inline只有在release版本下才能出现
  g++ -c main.cpp -O2
  objdump -t main.o就看不见sum的函数符号了
*/
int sum(int x, int y) 
{
    return x + y;
}
int main()
{
    int a = 10;
    int b = 20;
    int ret = sum(a, b);
    //此处有标准的函数调用过程  参数压栈，函数栈帧的开辟和回退过程
    //有函数调用的开销
    //这个函数只是进行x+y,当函数调用开销大于函数执行的开销时，函数非常简单可以考虑用内联函数
    std::cout << "Hello World!\n";
}
```

### 函数重载

```c++
#include <iostream>
#include<typeinfo>
/*
函数重载
1.C++为什么支持函数重载，C语言不支持函数重载
    C++代码产生函数符号的时候，函数名+参数列表类型组成的
    C代码产生函数符号的时候，函数名来决定！
2.函数重载需要注意些什么？
3.C++和C语言代码之间如何互相调用

什么是函数重载？
    1.一组函数，其中函数名相同，参数列表的个数或者类型不同，那么这一组函数就称作函数重载
    2.一组函数要称得上重载，一定先是处在同一个作用域当中的。
    3.const或者volatile，是如何影响形参类型的。
    4.一组函数，函数名相同，参数列表也相同，仅仅是返回值不同？不叫重载

请你解释一下，什么是多态？
静态(编译时期)的多态：函数重载
动态(运行时期)的多态：

C++调用C代码：无法直接调用了！函数符号不统一
同样的int sum(int a,int b);C:sum，C++:sum_int_int
在C++文件C函数的声明括在extern "C"里面后续就可以使用了
extern "C"
{
    int sum(int a,int b);//按照C的方式生成符号
}
C调用C++：无法直接调用了！函数符号不统一
在C++文件中把C++源码括在extern "C"中。
extern "C"
{
    int sum(int a,int b)//按照C的方式生成符号
    {
        return a+b;
    }
}

只要是C++编译器，都内置了_cplusplus
#ifdef _cplusplus
extern "C"{
#endif
    int sum(int a,int b)
    {
        return a+b;
    }
#ifdef _cplusplus
}
这样既可以在C++编译器编译还可以在其他语言的编译器下运行
#endif
*/
void func(int a) {} //int
void func(const int a) {}//int 这样不算重载
int main() 
{
    int a = 10;
    const int b = 10;
    std::cout << typeid(a).name() << std::endl;//int
    std::cout << typeid(b).name() << std::endl;//int
    return 0;
}

#if 0
bool compare(int a, int b) //compare_int_int
{
    std::cout << "compare_int_int" << std::endl;
    return a > b;
}
bool compare(double a, double b) //compare_double_double
{
    std::cout << "compare_double_double" << std::endl;
    return a > b;
}
bool compare(const char* a, const char* b) //compare_const char*_const char*
{
    std::cout << "compare_char*_char*" << std::endl;
    return strcmp(a, b) > 0;
}
int main()
{
    //bool compare(int a, int b);//函数声明如果在函数体内声明，函数内重载的都会使用这个函数，优先当前作用域
    compare(10, 20);
    compare(10.0, 20.0);
    compare("aaa", "bbb");
    std::cout << "Hello World!\n";
}
#endif
```

### const

#### const基本用法

```c++
#include <iostream>
#include <typeinfo>
using namespace std;

/*
const如何理解
const修饰的变量不能够再作为左值，初始化完成后，值不能够被修改
常量是左值（const 是左值），但它是不能作为赋值语句左边的左值，因为它是只读的

C和C++中const的区别是什么
const的编译方式不同，C中，const就是当作一个变量来编译生成指令的。
C++中，所有出现const常量名字的地方，都被常量的初始化值替换了。

C++的const必须初始化，叫常量
但是如果初始化的值是一个变量，不是立即数。这个const变量就变为常变量了，和C中的一样
int b=20;
const int a = b;
*/
int main()
{
    const int a = 20;//必须初始化
    int array[a] = {};//可以执行
    int* p = (int*)&a;
    *p = 30;//这里已经把a的值改为30

    printf("%d %d %d \n", a, *p, *(&a));
    //输出结果20 30 20
    //为什呢a和*(&a)是20呢，在编译阶段就已经将a和 *(&a)->优化为a替换为20
    //*p指向的a对应地址空间的值，所以为30
    return 0;
}
```

```c
#include<stdio.h>
/*
const修饰的量，可以不用初始化
不叫常量，叫做常变量
*/

void main() 
{
	const int a = 20;//不初始化可以过
	//int array[a]={};这个是不允许的
	int* p = (int*)&a;
	*p = 30;

	printf("%d %d %d \n", a, *p, *(&a));
	//输出结果为30 30 30
}
```

#### const和一二级指针的结合

```c++
#include <iostream>
#include <typeinfo>
using namespace std;
/*
const和一级指针的结合
const和二级(多级)指针的结合

const修饰的量   叫常量
和普通变量的区别:C++有两点区别？1.编译方式不同(直接替换) 2.不能作为左值了

const修饰的常量出现的错误：
1.常量不能作为左值 =》直接修改常量的值
2.不能把常量的地址泄露给一个普通的指针或者普通的引用变量 =》可以间接修改常量的值

const和一级指针的结合：有两种情况
C++语言规范：const修饰的是离他最近的类型
const int *p; 
这个修饰的是*p，可以任意指向不同的int类型的内存，但是不能通过指针间接修改指向的内存的值。
int const *p;
这个和上面相同。
int *const p;
这个修饰的是p,p变为常量了。不能再指向其他内存，但是可以通过指针解引用修改指向的内存的值
const int *const p;
这个即不能再指向其他内存，也不可以通过指针解引用修改指向的的内存的值。





总结const和指针的类型转换公式：
int * <= const int* 是错误的
const int* <= int*  是可以的

int ** <=const int **   是错误的 这两个两边都有const才可以
const int ** <=int **   是错误的

int ** <= int* const*   是错误的 这俩个可以通过推一级指针看是否可以
int*const* <= int**     是可以的
*/
int main01()
{
    const int a = 10;
    //int* p = &a;//int * <= const int*,C++编译器是不允许的，那该如何修改呢，
    //这里我不想p通过解引用修改a的值，因为a是const修饰的。至于p本身可不可以被修改，不关心。
    const int* p = &a;
    int b = 20;
    const int* p2 = &b;//const int* 《= int *
    int* const p3 = &b;//int * 《= int *


    int* q1 = nullptr;
    int* const q2 = nullptr;
    std::cout << typeid(q1).name() << std::endl;
    std::cout << typeid(q2).name() << std::endl;
    //这两个结果都是int *
    //在编译器角度，const如果右边没有指针*的话，const是不参与类型的
    return 0;
}

/*
const和二级指针的结合
C++语言规范：const修饰的是离他最近的类型
const int **q;
int *const*q;
int **const q;
*/
int main() 
{
    int a = 10;
    int* p = &a;
    //const int** q = &p;//const int** <= int** 是错误的 
    //有两种解决办法，const int** q目的是保证a是不能通过q修改，但是*q是可以修改a的地址
    //所以const int* const * q 让*q不可以修改。
    //另一种把int *p=&a变为const int * p=&a;    
    return 0;
}
```

### C++引用

```c++
#include <iostream>
#include <typeinfo>
using namespace std;
/*
C++的引用 引用和指针的区别？
1.左值引用和右值引用
2.引用的实例

引用是一种更安全的指针。
1.引用是必须初始化的，指针可以不初始化
2.引用只有一级引用，没有多级引用，指针可以有一级指针，也可以有多级指针
3.定义一个引用变量，和定义一个指针变量，其汇编指令是一模一样的;通过引用变量修改所引用内存的值，和通过指针解引用
修改所引用内存的值，和通过指针解引用修改指针指向的内存的值，其底层指令也是一模一样的。


右值引用
1.int &&c=20;专门用来引用右值类型，指令上，可以自动产生临时量，然后直接引用临时量，可以进行修改c=40;
2.右值引用变量本身是一个左值，只能用左值引用来引用它
3.不能用一个右值引用变量，来引用一个左值。
*/
#if 0
int main()
{
    int a = 10;
    int* p = &a;
    int& b = a;
    /*
    int* p = &a;
    00007FF7D3B323C4  lea         rax,[a]  
    00007FF7D3B323C8  mov         qword ptr [p],rax  
    int& b = a;
    00007FF7D3B323CC  lea         rax,[a]  
    00007FF7D3B323D0  mov         qword ptr [b],rax  
    从这里可以看出引用底层和指针是一样的
    *p = 20;
    00007FF7977E23D4  mov         rax,qword ptr [p]
    00007FF7977E23D8  mov         dword ptr [rax],14h
    b = 30;
    00007FF7977E243A  mov         rax,qword ptr [b]
    00007FF7977E243E  mov         dword ptr [rax],1Eh
    引用底层也是解引用实现赋值操作
    */
    *p = 20;
    //20 20 20
    std::cout << a << " " << *p << " " << b << std::endl;

    b = 30;
    //30 30 30
    std::cout << a << " " << *p << " " << b << std::endl;
    //int& c = 20;//这个是不可以的，必须是可以取地址的
    return 0;
}


int main() 
{
    int array[5] = {};
    int* p = array;
    //定义一个引用变量，来引用array数组
    //int(*q)[5] = &array;
    int(&q)[5] = array;
    std::cout << sizeof(array) << std::endl;//20
    std::cout << sizeof(p) << std::endl;//4(32位) 8(64位)
    std::cout << sizeof(q) << std::endl;//20 q相当于array的别名
}
#endif
int main() 
{
    int a = 10;//左值，它有内存，有名字，值可以修改的
    int& b = a;
    //int& c = 20;//20是右值：没内存，没名字
    //C++提供了右值引用
    int&& c = 20;
    //这个是和下面是一样的，区别在于c是可以修改的，d不可以
    const int& d = 20;
    /*
    int temp=20;
    tmep-> d对应的底层地址

    int&& c = 20;
    00007FF73A5C1F4C  mov         dword ptr [rbp+64h],14h
    00007FF73A5C1F53  lea         rax,[rbp+64h]
    00007FF73A5C1F57  mov         qword ptr [c],rax
    const int& d = 20;
    00007FF73A5C1F5B  mov         dword ptr [rbp+0A4h],14h
    00007FF73A5C1F65  lea         rax,[rbp+0A4h]
    00007FF73A5C1F6C  mov         qword ptr [d],rax
    可以看出底层代码是一致的
    */
    c = 30;
    /*
    c = 30;
    00007FF73A5C1F73  mov         rax,qword ptr [c]  
    00007FF73A5C1F77  mov         dword ptr [rax],1Eh 
    这里也是通过临时量修改
    */
    int& e = c;//一个右值引用变量，本身是一个左值。
}
```

### const，指针，引用的结合使用

```c++
#include <iostream>


/*
const,一级指针，引用的结合使用
*/
int main()
{
    //写一句代码，在内存的0x0018ff44处写一个4字节的10
    //int* const &p = (int*)0x0018ff44;
    //int* &&p= (int*)0x0018ff44;
    int a = 10;
    int* p = &a;
    //const int*& q = p;这句是执行不了的
    //const int*& q = p;首先&不参与类型指定，所以单看好像是const int * 《= int *好像没问题
    //但是底层&是和指针相同的，我们前面学过const和多级指针的判断
    //还原成const int **q=&p;这时候const int ** 《= int **,这下是有问题的。
    return 0;
}
```

### new和delete

```c++
#include <iostream>
/*
new和delete
new和malloc的区别
delete和free的区别

malloc和free,称作C的库函数
new和delete,称作运算符

new不仅可以做内存开辟，还可以做内存初始化操作
malloc开辟内存失败，是通过返回值和nullptr作比较；
而new开辟内存失败，是通过抛出bad_alloc类型的异常来判断的。

delete和free
free一般用于C,delete用于C++。free只是释放所对应的内存。delete在对象中除了会释放所对应的内存，还会执行对象的析构函数
*/
#if 0
int main()
{
    int* p = (int*)malloc(sizeof(int));
    if (p == nullptr)
    {
        return -1;
    }
    *p = 20;
    free(p);

    int* p1 = new int(20);
    delete p1;

    
    //开辟数组
    int* q = (int*)malloc(sizeof(int) * 20);
    if (q == nullptr)
    {
        return -1;
    }
    free(q);
    
    int* q1 = new int[20];//20个int
    delete[]q1;
    
    return 0;
}
#endif
int main()
{
    //new有多少种
    int* p1 = new int(20);
    int* p2 = new (std::nothrow) int;//未开辟成功，不会抛出异常
    const int* p3 = new const int(40);//在堆区开辟一个常量
    //定位new
    int data = 0;
    int* p4 = new (&data) int(50);//在指定的地址开辟空间
    std::cout << "data:" << data << std::endl;//data变为50
    return 0;
}
```

## C++面向对象

### 类和对象，this指针

```c++
#include <iostream>
/*
C++ OOP面向对象 OOP编程，this指针
C: 各种各样的函数的定义 struct
C++：类 =》实体的抽象类型
实体（属性，行为） -> ADT(abstract data type)抽象数据类型
  |                                 |
对象      (实例化) <- 类(属性->成员变量  行为->成员方法)

OOP语言的四大特征是什么？
抽象     封装/隐藏    继承  多态

访问限定符：public公有的 private私有的 protected保护的
*/
const int NAME_LEN = 20;
class CGoods //=>商品的抽象数据类型
{
public://给外部提供公有的成员方法，来访问私有的属性
    //做商品数据初始化用的
    void init(const char* name, double price, int amount);
    //打印商品信息
    void show();
    //给成员变量提供一个getXXX或者setXXX的方法
    //类体内实现的方法，自动处理成inline内联函数
    void setName(char* name) { strcpy(_name, name); }
    void setPrice(double price) { _price = price; }
    void setAmount(int amount) { _amount = amount; }
    const char* getName() { return _name; }
    double getPrice() { return _price;}
    int getAmount() { return _amount; }
private://属性一般都是私有的成员变量
    char _name[NAME_LEN];
    double _price;
    int _amount;
};
void CGoods::init(const char* name, double price, int amount)
{
    strcpy(_name, name);
    _price = price;
    _amount = amount;
}
void CGoods::show()
{
    std::cout << "name:" << _name << std::endl;
    std::cout << "price:" << _price << std::endl;
    std::cout << "amount:" << _amount << std::endl;
}
int main()
{
    /*
    CGoods可以定义无数的对象，每一个对象都有自己的成员变量，但是他们共享一套成员方法
    成员方法如何知道自己所要修改的对象是谁呢？
    类的成员方法一经编译，所有的方法参数，都会加一个this指针，接收调用该方法的的对象的地址。
    底层会自动转变void init(CGoods *this,const char* name, double price, int amount)，里面的变量会变成this.变量名。
    这样就可以区分是哪个对象了。
    */
    //对象内存大小=》只和成员变量有关，与成员方法无关
    CGoods good;//类实例化了一个对象
    good.init("面包", 10.0, 200);
    good.show();
    good.setPrice(20.5);
    good.setAmount(100);
    good.show();
    return 0;
}
```

### 构造函数和析构函数

```c++
#include <iostream>
/*
构造函数和析构函数
OOP实现一个顺序栈

构造函数和析构函数
函数的名字和类名一样
没有返回值
*/
class SeqStack
{
public:
    //构造函数
    SeqStack(int size = 10) //是可以带参数的，因此可以提供多个构造函数，叫做构造函数的重载
    {
        std::cout << this << "SeqStack()" << std::endl;
        _pstack = new int[size];
        _top = -1;
        _size = size;
    }
    //析构函数
    ~SeqStack() //是不带参数的，所有析构函数只能有一个
    {
        std::cout << this << "~SeqStack()" << std::endl;
        delete[]_pstack;
        _pstack = nullptr;
    }
    void init(int size = 10) 
    {
        _pstack = new int[size];
        _top = -1;
        _size = size;
    }
    void release()
    {
        delete[]_pstack;
        _pstack = nullptr;
    }
    void push(int val)
    {
        if (full())
            resize();
        _pstack[++_top] = val;
    }
    void pop() 
    {
        if (empty())
            return;
        --_top;
    }
    int top() 
    {
        return _pstack[_top];
    }
    bool empty()
    {
        return _top == -1;
    }
    bool full()
    {
        return _top == _size - 1;
    }
private:
    int* _pstack;//动态开辟数组，存储顺序栈的元素
    int _top;//指向栈顶元素的位置
    int _size;//数组扩容的总大小
    void resize() 
    {
        int* ptmp = new int[_size * 2];
        for (int i = 0;i < _size;i++) 
        {
            ptmp[i] = _pstack[i];
        }
        delete[]_pstack;
        _pstack = ptmp;
        _size *= 2;
    }
};
SeqStack s;//是建立在数据段上的，程序结束析构函数执行(最后析构)
int main()
{
    /*
    .data
    heap
    stack
    */
    SeqStack* ps = new SeqStack(60);//这个是建立在堆上的，相当于malloc内存开辟+SeqStack(60)构造
    ps->push(70);
    ps->push(80);
    ps->pop();
    std::cout << ps->top() << std::endl;
    delete ps;//只有delete后才会触发析构函数，delete过程：先调用ps->~SeqStack(),然后free(ps)
    SeqStack s;//1.开辟内存 2.调用构造函数 这个析构函数执行在当前函数结束时
    //s.init(5);
    for (int i = 0;i < 15;i++)
    {
        s.push(rand() % 100);
    }
    while (!s.empty())
    {
        std::cout << s.top() << " ";
        s.pop();
    }
    //s.release();
    //s.~SeqStack();//析构函数调用以后，对象不存在了
    //s.push(30);//堆内存的非法访问，所以不建议自己单独调用析构函数。
    return 0;
}
```

### 对象的深拷贝和浅拷贝

![4](C-basiclearning/4.png)

```c++
#include <iostream>
/*
this指针 =》类 ->很多对象 共享一套成员方法
成员方法，方法的参数都会添加一个this指针

构造函数：
    定义对象时，自动调用的；可以重载的；构造完成，对象产生了
析构函数：
    不带参数，不能重载，只有一个析构函数；析构完成，对象就不存在了

对象的深拷贝和浅拷贝
*/

class SeqStack
{
public:
    //构造函数
    SeqStack(int size = 10) //是可以带参数的，因此可以提供多个构造函数，叫做构造函数的重载
    {
        std::cout << this << "SeqStack()" << std::endl;
        _pstack = new int[size];
        _top = -1;
        _size = size;
    }
    //自定义拷贝构造函数 《=对象的浅拷贝现在有问题了
    SeqStack(const SeqStack& src) 
    {
        _pstack = new int[src._size];
        for (int i = 0;i < src._top;i++)
        {
            _pstack[i] = src._pstack[i];
        }
        //这里赋值为什么不使用memcpy或者realloc,如果是对指针数组的拷贝的话
        //那它本身是浅拷贝。所以这里一定要用for循环赋值
        _top = src._top;
        _size = src._size;
    }
    //赋值重载函数(浅拷贝存在问题)
    void operator=(const SeqStack& src)
    {
        //防止自赋值
        if (this == &src)
            return;
        //需要先释放当前对象占用的外部资源
        delete[]_pstack;
        _pstack = new int[src._size];
        for (int i = 0;i < src._top;i++)
        {
            _pstack[i] = src._pstack[i];
        }
        //这里赋值为什么不使用memcpy或者realloc,如果是对指针数组的拷贝的话
        //那它本身是浅拷贝。所以这里一定要用for循环赋值
        _top = src._top;
        _size = src._size;
    }
    //析构函数
    ~SeqStack() //是不带参数的，所有析构函数只能有一个
    {
        std::cout << this << "~SeqStack()" << std::endl;
        delete[]_pstack;
        _pstack = nullptr;
    }
    void init(int size = 10)
    {
        _pstack = new int[size];
        _top = -1;
        _size = size;
    }
    void release()
    {
        delete[]_pstack;
        _pstack = nullptr;
    }
    void push(int val)
    {
        if (full())
            resize();
        _pstack[++_top] = val;
    }
    void pop()
    {
        if (empty())
            return;
        --_top;
    }
    int top()
    {
        return _pstack[_top];
    }
    bool empty()
    {
        return _top == -1;
    }
    bool full()
    {
        return _top == _size - 1;
    }
private:
    int* _pstack;//动态开辟数组，存储顺序栈的元素
    int _top;//指向栈顶元素的位置
    int _size;//数组扩容的总大小
    void resize()
    {
        int* ptmp = new int[_size * 2];
        for (int i = 0;i < _size;i++)
        {
            ptmp[i] = _pstack[i];
        }
        delete[]_pstack;
        _pstack = ptmp;
        _size *= 2;
    }
};
int main()
{
    //SeqStack s;//没有提供任意构造函数的时候，会为你生成默认构造和默认析构，是空函数。
    SeqStack s1(10);
    SeqStack s2 = s1;//默认拷贝构造函数=》做直接内存数据拷贝
    //SeqStack s3(s1);

    //s2.operator=(s1)
    //void operator=(const SeqStack &src)
    s2 = s1;//默认的赋值函数 =》做直接的内存拷贝(浅拷贝)
    return 0;
}
```

