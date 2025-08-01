---
title: Linux网络编程
date: 2025-07-16 22:54:16
tags: Linux Network Programming
categories: Linux Network Programming
updated: 2025-07-24 21:26:16
comments: true
---

## 网络基础

### **mac地址**（6个字节 48位）

标记网卡的id,；理论上这个id全球唯一

**mac地址一般用来标识主机的id,这个id是物理地址，不会改变。**

### **ip地址，ipv4(4个字节，32位)，ipv6(16个字节，128位)**

IP地址是标识主机的id,这个id是虚拟的，会改变。

一个IP将其分为子网id和主机id

**子网id和主机id需要和子网掩码一起来看，**

![1](Linux网络编程/1.png)

ping命令用来测试两台主机的网络联通性（windows和Linux都适用）。

Linux下设置ip命令

```bash
ifconfig ens33 192.168.131.133 netmask 255.255.255.0
```

### **桥接模式（Bridged Networking）**

桥接模式是将虚拟机/容器的网络**桥接到物理网卡**上，使其就像是局域网中的一台独立主机。

工作原理：

虚拟机通过虚拟网桥（Bridge）连接到宿主机的物理网卡，相当于直接插入交换机，与宿主机处于**同一物理局域网**中。

网络特点：

- 虚拟机可获得**与宿主机同网段的IP地址**（例如通过 DHCP）
- 可以被局域网中其他设备访问（可 ping 通）
- 能访问局域网和外网

优点：

- 网络透明，虚拟机像一台真实的独立主机
- 易于与其他局域网设备通信

缺点：

- 需要宿主网络支持（如局域网允许多个 IP）
- 有可能增加网络冲突和安全风险

### **NAT 模式（网络地址转换）**

NAT 模式是虚拟机/容器通过宿主机的网络连接上网，**共享宿主机的 IP**。

工作原理：

宿主机充当“路由器”，将虚拟机的私有 IP 转换为宿主的公网 IP，进行地址转换。

网络特点：

- 虚拟机使用**私有 IP 地址（如 192.168.xx.xx）**
- 能访问外网，但外部主机**无法主动访问虚拟机**
- 类似家庭内的多台设备通过路由器上网

优点：

- 设置简单，几乎无须额外配置
- 安全性高，外部无法直接访问虚拟机

缺点：

- 虚拟机不能被外部主机主动访问（除非端口转发）
- 网络透明度低，不适合复杂网络测试

### 端口（port）

**作用：用来标识应用程序（进程）**

**port:两个字节 0-65535**

**0-1023 知名端口**

**自定义端口1024-65535（避免冲突）**

**一个应用可以有多个端口，一个端口只能有一个应用程序。**

### OSI七层模型

为了使各种不同的计算机之间可以互联，ARPANet指定了一套计算机通信协议，即TCP/IP协议（族）；

为了减少协议设计的复杂性，大多数网络模型均采用分层的方式来组织。

每一层利用下一层提供的服务来为上一层提供服务，本层服务的实现细节对上层屏蔽。

**物理层：双绞线（网线）接口类型，光纤的传输速率等等**

**数据链路层：mac 负责收发数据**

**网络层：ip 给两台主机提供路径选择。**

**传输层：port 区分数据递送到那个应用程序。**

**会话层：建立连接**

**表示层：解码**

**应用层：应用程序**

![2](Linux网络编程/2.png)

### TCP/IP四层模型

![3](Linux网络编程/3.png)

### 协议

**规定了数据传输的方式和格式**

**这里主要按照TCP/IP四层模型有的协议。**

**应用层协议：**

**FTP:文件传输协议**

**HTTP:超文本传输协议**

**NFS:网络文件系统**

**传输层协议：**

**TCP:传输控制协议** 头部20个字节

**UDP:用户数据报协议** 头部8个字节

**网络层：**

**IP:英特网互联协议** 头部20个字节

**ICMP:英特网控制报文协议 ping命令就是这个协议**
**IGMP：英特网组管理协议**

**链路层：**

**ARP:地址解析协议 通过ip找mac地址**

**RARP:反向地址解析协议 通过mac找ip**

**硬件接口：mac头** 头部14个字节

目的mac地址为ff:ff:ff:ff:ff:ff 局域网内其他主机无条件接受。（常在ARP协议上使用）

![4](Linux网络编程/4.png)

### 网络设计模式

**B/S browser/server**

**C/S client/server**

C/S 性能较好 客户端容易篡改数据 开发周期较长

B/S 性能低 客户端安全 开发周期短

### TCP三次握手

tcp建立连接的过程 **SYN是请求建立连接的标识，ACK就是确认。**

![9](Linux网络编程/9.png)

**mss:最大报文长度，一般出现在三次握手的前两次，用来告知对方传送数据的最大长度。**

**MTU:最大传输单元 由网卡限制**

### TCP四次挥手

tcp断开连接，这个哪一方发起断开都可以，就以客户端申请断开为例子，三次握手一定是客户端发起。

就是两端的某一段调用了close函数。

**FIN是请求断开连接的标识**

![10](Linux网络编程/10.png)

### 滑动窗口

**TCP报头上有一个窗口尺寸的标识，这个是说接收方告知发送方：我的接收缓冲区还能接收多少字节。**

**在ACK标识回复时会带有win剩余多少空间。**

**这样发送方就会发送以避免拥堵，因为知道接收方还剩下多少空间，接收方是把当前接收缓冲区的一块数据提取出来，才会回复给发送方ACK携带当前缓冲区大小告知对方。**

### TCP状态转换

![11](Linux网络编程/11.png)

如果想要查看TCP应用的状态

```bash
netstat -anp | grep 8000(端口)
```

### 半关闭

**主动方在FIN_WAIT_2状态之后，主动方不可以在应用层发送数据了，但是应用层还可以接受数据，这个状态叫半关闭。**

**有人就有疑惑了，那为什么在TIME_WAIT状态还能发，因为它发的是ACK,主动方不可以在应用层发送数据了，指的是应用层的协议不可以接受了，但是在底层，传输层TCP协议还是可以发出，所以ACK是可以发的**。

```c
#include <sys/socket.h>
int shutdown(int sockfd, int how);
参数：
    sockfd:需要关闭的socket的描述符
    how:允许为shutdown操作选择以下几种方式：
        SHUT_RD(0):关闭sockfd上的读功能，此选项将不允许sockfd进行读操作。该套接字不再接收数据，任何当前在套接字接受缓冲区的数据将被丢弃。
        SHUT_WR(1):关闭sockfd上的写功能，此选项将不允许sockfd进行写操作。进程不能再对此套接字发出写操作
        SHUT_RDWR(2):关闭sockfd的读写功能。相当于调用shutdown两次：首先是SHUT_RD,然后是SHUT_WR。
```

### TCP异常断开

#### 心跳包(TCP 的 keepalive 机制)

**SO_KEEPALIVE保持连接检测对方主机是否崩溃，避免服务器永远阻塞于TCP连接的输入。设置该选项后，如果两小时内在此套接口的任一方向都没有数据交换，TCP会自动给对方发一个保持存活探测分节，这是一个对方必须响应的TCP分节。他会导致以下三种情况：**

1. **对方接收一切正常：以期望的ACK响应。2小时后，TCP将发出另一个。**
2. **对方已崩溃且已重新启动：以RST响应。套接口的待处理错误设置为ECONNRESET,套接口本身被关闭。**
3. **对方无任何响应：源自berkeley的TCP发送另外8个探测分节，相隔75秒一个，试图得到一个响应。在发出第一个探测分节11分钟15秒后若仍无响应就放弃。套接口的待处理错误被置为ETIMEOUT,套接口本身就关闭。若ICMP错误是host unreachable(主机不可达),说明对方主机没有崩溃，但是不可达，这种情况下待处理错误设置为EHOSTUNREACH.**

**所以我们可以设置SO_KEEPALIVE属性使得我们在两小时后发现对方的TCP连接是否依然存在。**

```c
keepAlive=1;
setsockopt(listenfd,SOL_SOCKET,SO_KEEPALIVE,(void *)&keepAlive,sizeof(keepAlive));
```

**但是说真的，这个函数两小时检测一次，对于现在来说，有点太长了，所以可以自己在应用层写对应的心跳包。**

心跳包：最小粒度，携带的数据部分一定要少。

乒乓包：携带比较多的数据的心跳包。

### 端口复用

端口重新启用，谁最后启用的端口谁用。前面启用的作废，用不了了。为什莫需要端口复用呢，在server的TCP连接没有完全断开之前不允许重新监听。比如我强制退出server,再启动就不会说端口被占用了。

```c
在server代码的socket()和bind()调用之间插入如下代码：
int opt=1;
setsockopt(listenfd,SOL_SOCKET,SO_REUSEADDR,&opt,sizeof(opt));
```

### UDP

**TCP:传输控制协议 安全可靠 丢包重传 面向连接(电话模型)**

**UDP:用户数据报协议 不安全不可靠 丢包不重传 快 不面向连接(邮件模型)**

**tcp通信流程：**
**服务器：创建流式套接字 绑定 监听 提取 读写 关闭**

**客户端：创建流式套接字 连接 读写 关闭**

**收发数据：**

**read recv**

```c
#include <sys/socket.h>

ssize_t recv(int sockfd, void buf[.len], size_t len,
  int flags);
flags==MSG_PEEK 读数据不会删除缓冲区的数据 一般填0
```

**write send**

```c
 #include <sys/socket.h>
 ssize_t send(int sockfd,
   const void buf[.len], size_t len, int flags);//flags=1表示紧急数据 一般填0
```

**udp通信流程：**

**服务器：创建报式套接字 绑定 读写 关闭**

**客户端：创建报式套接字 读写 关闭**

**发数据：**

```c
#include <sys/socket.h>
ssize_t sendto(int sockfd,
  const void buf[.len], size_t len, int flags,
    const struct sockaddr * dest_addr, socklen_t addrlen);
dest_addr:目的地的地址信息
addrlen:结构体大小
```

**收数据：**

```c
#include <sys/socket.h>
ssize_t recvfrom(int sockfd, void buf[restrict.len], size_t len,
  int flags,
  struct sockaddr * _Nullable restrict src_addr,
  socklen_t * _Nullable restrict addrlen);
src_addr：对方的地址信息
addrlen：结构体大小地址    
```

创建报式套接字

```c
int socket(int domain,int type,int protocol);
参数：
    domain:AF_INET
    type:SOCK_DGRAM
    protocol:0
```

UDP一般是一对一的。一个套接字服务一个客户端，不像TCP,后来可以分配套接字。

### UDP服务器和客户端代码实现

```c
#include<stdio.h>
#include<sys/socket.h>
#include<stdlib.h>
#include<unistd.h>
#include<arpa/inet.h>
int main(int argc,char *argv[]){
    //创建套接字
    int fd=socket(AF_INET,SOCK_DGRAM,0);
    //绑定
    struct sockaddr_in myaddr;
    myaddr.sin_family=AF_INET;
    myaddr.sin_port=htons(8000);
    myaddr.sin_addr.s_addr=inet_addr("127.0.0.1");
    int ret=bind(fd,(struct sockaddr*)&myaddr,sizeof(myaddr));
    if(ret<0){
        perror("bind");
        return 0;
    }
    //读写
    char buf[1500]="";
    struct sockaddr_in cliaddr;
    socklen_t len=sizeof(cliaddr);
    while(1){
        int n=recvfrom(fd,buf,sizeof(buf),0,(struct sockaddr*)&cliaddr,&len);
        if(n<0){
            perror("");
            break;
        }
        else{
            printf("%s\n",buf);
            sendto(fd,buf,n,0,(struct sockaddr*)&cliaddr,len);
        }
    }
    //关闭
    close(fd);
}
```

```bash
hello
```

```bash
nc -u 127.0.0.1 8000 #这里连接服务器加上-u 表示连接的是udp
```

```c
#include<stdio.h>
#include<sys/socket.h>
#include<stdlib.h>
#include<unistd.h>
#include<arpa/inet.h>
#include<string.h>
int main(int argc,char *argv[]){
    //创建套接字
    int fd=socket(AF_INET,SOCK_DGRAM,0);
    //绑定
    struct sockaddr_in myaddr;
    myaddr.sin_family=AF_INET;
    myaddr.sin_port=htons(9000);
    myaddr.sin_addr.s_addr=inet_addr("127.0.0.1");
    int ret=bind(fd,(struct sockaddr*)&myaddr,sizeof(myaddr));
    if(ret<0){
        perror("bind");
        return 0;
    }
    //读写
    char buf[1500]="";
    struct sockaddr_in dstaddr;
    dstaddr.sin_family=AF_INET;
    dstaddr.sin_port=htons(8000);
    dstaddr.sin_addr.s_addr=inet_addr("127.0.0.1");
    int n=0;
    while(1){
        n=read(STDIN_FILENO,buf,sizeof(buf));
        sendto(fd,buf,n,0,(struct sockaddr*)&dstaddr,sizeof(dstaddr));
        memset(buf,0,sizeof(buf));
        int n=recvfrom(fd,buf,sizeof(buf),0,NULL,NULL);
        if(n<0){
            perror("");
            break;
        }
        else{
            printf("%s\n",buf);
        }
    }
    //关闭
    close(fd);
}

```

```bash
hello
hello

hhhhh
hhhhh

woshinidia
woshinidia
```

### 本地套接字通信

**unix domain socket又是一个新的IPC方式，**“本地套接字”通常指的是 **Unix 域套接字（Unix Domain Socket，UDS）**，是一种用于**同一台主机内部进程间通信（IPC）**的套接字，与 TCP/IP 套接字相比，它不经过网络协议栈，速度更快、效率更高。

**全双工**

**套接字用文件来标识，这个文件在绑定之前是不能存在的。**

**作用**：实现本地进程间通信，替代管道、共享内存等传统 IPC 手段。

**协议族**：使用 `AF_UNIX` 或 `AF_LOCAL` 而不是 `AF_INET`。

**通信方式**：支持 `SOCK_STREAM`（类似 TCP）和 `SOCK_DGRAM`（类似 UDP）。

**地址类型**：使用文件系统中的路径名作为标识（如 `/tmp/mysock`）。

本地套接字实现tcp通信

1. 创建本地套接字
2. 绑定
3. 监听
4. 提取
5. 读写
6. 关闭

创建本地套接字用于tcp通信

```c
int socket(int domain,int type,int protocol);
参数：
    domain:AF_UNIX
    type:SOCK_STREAM
    protocol:0
```

绑定

```c
#include <sys/socket.h>

int bind(int sockfd,
  const struct sockaddr * addr,
    socklen_t addrlen);
参数:
	sockfd：本地套接字
    addr：本地套接字结构体地址
struct sockaddr_un {
  sa_family_t sun_family; /* AF_UNIX */
  char sun_path[108]; /* Pathname */
};   
	addrlen:sockaddr_un大小
```

提取

```c
#include <sys/socket.h>
int accept(int sockfd, struct sockaddr * _Nullable restrict addr,
  socklen_t * _Nullable restrict addrlen);
addr:struct sockaddr_un结构体来接
```

### 本地套接字实现tcp服务器和客户端代码实现

```c
#include<stdio.h>
#include<sys/socket.h>
#include<arpa/inet.h>
#include<unistd.h>
#include<string.h>
#include<stdlib.h>
#include<sys/un.h>
int main(int argc,char *argv[]){
    //删除文件，文件如果先前存在会通信不了
    unlink("sock.s");
    //创建unix流式套接
    int lfd=socket(AF_UNIX,SOCK_STREAM,0);
    //绑定
    struct sockaddr_un myaddr;
    myaddr.sun_family=AF_UNIX;
    strcpy(myaddr.sun_path,"sock.s");

    bind(lfd,(struct sockaddr*)&myaddr,sizeof(myaddr));
    //监听
    listen(lfd,128);
    //提取
    struct sockaddr_un cliaddr;
    socklen_t len=sizeof(cliaddr);
    int cfd=accept(lfd,(struct sockaddr*)&cliaddr,&len);
    printf("new client file=%s\n",cliaddr.sun_path);
    //读写
    char buf[1500]="";
    while(1){
        int n=recv(cfd,buf,sizeof(buf),0);
        if(n<=0){
            break;
        }else{
            printf("%s\n",buf);
            send(cfd,buf,n,0);
        }
    }
    close(cfd);
    close(lfd);
}
```

```bash
new client file=
hellop
#使用nc连接服务器
 nc -U sock.s
```

```c
#include<stdio.h>
#include<arpa/inet.h>
#include<sys/socket.h>
#include<stdlib.h>
#include<string.h>
#include<sys/un.h>
#include<unistd.h>
int main(int argc,char *argv[]){
    unlink("sock.c");
    //创建unix流式套接字
    int cfd=socket(AF_UNIX,SOCK_STREAM,0);
    //如果不绑定就会隐式绑定
    struct sockaddr_un myaddr;
    myaddr.sun_family=AF_UNIX;
    strcpy(myaddr.sun_path,"sock.c");
    if(bind(cfd,(struct sockaddr*)&myaddr,sizeof(myaddr))<0){
        perror("");
        return 0;
    }    
    //连接
    struct sockaddr_un seraddr;
    seraddr.sun_family=AF_UNIX;
    strcpy(seraddr.sun_path,"sock.s");
    connect(cfd,(struct sockaddr *)&seraddr,sizeof(seraddr));
    //读写
    char buf[1500]="";
    while(1){
        char buf[1500]="";
        int n=read(STDIN_FILENO,buf,sizeof(buf));
        send(cfd,buf,n,0);
        memset(buf,0,sizeof(buf));
        n=recv(cfd,buf,sizeof(buf),0);
        if(n<=0){
            break;
        }
        else{
            printf("%s\n",buf);
        }
    }
    //关闭
    close(cfd);
    return 0;
}
```

```bash
hello
hello

我是你弟
我是你弟
```



## Socket编程

无名管道，命名管道，文件，信号，消息队列，共享内存只能用于本机的进程间通信。

**不同主机间进程通信方法：socket**

socket是一个伪文件。

![5](Linux网络编程/5.png)

**socket必须成对出现。**

### **大小端：**

**小端：低位存低地址，高位存高地址**

**大端：高位存低地址，低位存高地址**

**网络上走的数据都是大端的，主机的主机字节序是未知的，需要转换。**

- **协议头部：如 TCP/IP 头、DNS 头等 → 这些字段是标准协议的，必须按规定的大端（网络字节序）**
- **数据部分（Payload）：完全由你应用程序自己定义** 

网络字节序和主机字节序的转换

```c
#include<arpa/inet.h>

uint32_t htonl(uint32_t hostlong);//主机字节序转网络字节序（4个字节）转ip
uint16_t htons(uint16_t hostshort);//主机字节序转网络字节序（2个字节）转port
uint32_t ntohl(uint32_t netlong);
uint16_t ntohs(uint16_t netshort);
```

示例代码

```c
#include<arpa/inet.h>
#include<stdio.h>
int main(int argc,char *argv[]){
    char buf[4]={192,168,1,2};
    int num=*(int *)buf;
    int sum=htonl(num);
    unsigned char *p=&sum;
    printf("%d %d %d %d\n",*p,*(p+1),*(p+2),*(p+3));

    unsigned short a=0x0102;
    unsigned short b=htons(a);
    printf("%x\n",b);
    return 0;
}
```

```bash
2 1 168 192
201
```

说明我的电脑是小端。

### IP地址转换函数

```c
#include<arpa/inet.h>

int inet_pton(int af,const char *src,void *dst);
功能：将点分十进制串转成32位网络大端的数据
参数：af:
		AF_INET IPV4
        AF_INET6 IPV6
   	 src：点分十进制串的首地址
   	 dst:32位网络数据的首地址
返回值：
     成功：返回1
     失败：返回0
const char *inet_ntop(int af,const void *src,char *dst,socklen_t size);
功能：将32位大端的网络数据转成点分十进制串
参数：af:
		AF_INET IPV4
        AF_INET6 IPV6
   	 src：32位网络数据的首地址
   	 dst: 点分十进制串的首地址
     size:存储点分制串数组的大小 通常写16
返回值：
     存储点分制串数组的首地址。
支持IPV4和IPV6。
```

示例代码：

```c
#include<stdio.h>
#include<arpa/inet.h>

int main(int argc,char *argv[]){
    char buf[]="192.168.1.4";
    unsigned int num=0;
    inet_pton(AF_INET,buf,&num);
    unsigned char *p=(unsigned char *)&num;
    printf("%d %d %d %d\n",*p,*(p+1),*(p+2),*(p+3));
    char ip[16]="";
    inet_ntop(AF_INET,&num,ip,16);
    printf("%s\n",ip);
    return 0;
}
```

```bash
192 168 1 4
192.168.1.4
```

### ipv4套接字结构体

```c
 struct sockaddr_in {
   sa_family_t sin_family; /* address family: AF_INET */ 对应的协议（ipv4）
   in_port_t sin_port; /* port in network byte order */ 端口
   struct in_addr sin_addr; /* internet address */ ip地址
 };

 /* Internet address */
 struct in_addr {
   uint32_t s_addr; /* address in network byte order */ ip地址
 };
```

**ipv6套接字结构体太多了，这里不展示**

因为有这两种套接字结构体，所以我们要统一，方便函数编写。

**通用套接字结构体**

```c
struct sockaddr{
    sa_family_t sa_family; /* address family,AF_xxx*/
    char sa_data[14]; /*14 bytes of protocol address*/
};
```

### 网络套接字函数

tcp  特点：出错重传 每次发送数据，对方都会回ACK 可靠

#### 网络通信流程

![6](Linux网络编程/6.png)

#### 创建套接字函数socket()

```c
#include <sys/socket.h>
int socket(int domain,int type,int protocol);
功能：创建套接字
参数：domain:AF_INET
     type:SOCK_STREAM 流式套接字 用于TCP通信
     protocol:0
返回值：
     成功：返回文件描述符
     失败：返回-1
```

#### 连接服务器函数connect()

```c
#include <sys/socket.h>

int connect(int sockfd,
  const struct sockaddr * addr,
    socklen_t addrlen);
功能：连接服务器
参数：
    sockfd:socket套接字
    addr:ipv4套接字结构体地址
    addrlen:ipv4套接字结构体的长度
```

#### tcp客户端代码

```c
#include<arpa/inet.h>
#include<sys/socket.h>
#include<stdlib.h>
#include<string.h>
#include<stdio.h>
#include<unistd.h>
int main(int argc,char *argv[]){
    //创建套接字
    int sock_fd;
    sock_fd=socket(AF_INET,SOCK_STREAM,0);
    if(sock_fd==-1){
        printf("连接失败");
    }else{
        printf("连接成功");
    }
    //连接服务器
    struct sockaddr_in addr;
    addr.sin_family=AF_INET;
    addr.sin_port=htons(8000);
    inet_pton(AF_INET,"127.0.0.1",&addr.sin_addr.s_addr);  
    connect(sock_fd,(struct sockaddr *)&addr,sizeof(addr));
    //读写数据
    char buf[1024]="";
    while(1){
        int n=read(STDIN_FILENO,buf,sizeof(buf));
        write(sock_fd,buf,n);//发送数据给服务器
        n=read(sock_fd,buf,sizeof(buf));
        write(STDOUT_FILENO,buf,n);

    }
    //关闭
    close(sock_fd);
    return 0;
}
```

#### tcp服务器通信流程

![7](Linux网络编程/7.png)

对于得到一个新的连接套接字（提取连接部分），服务器是要接受多个客户端连接的，所以先连接上，再分配新的连接和客户端通信。

![8](Linux网络编程/8.png)

#### bind函数

给套接字绑定固定的端口和ip

```c
#include <sys/socket.h>

int bind(int sockfd,
  const struct sockaddr * addr,
    socklen_t addrlen);
功能：给套接字绑定固定的端口和ip
参数：
    sockfd:套接字
    addr:ipv4套接字结构体地址
    addrlen:ipv4结构体的大小
返回值：
    成功：返回0
    失败：返回-1
```

#### listen函数

```c
#include <sys/socket.h>

int listen(int sockfd, int backlog);
功能：
    监听套接字
参数：
    sockfd:套接字
    backlog:已完成连接队列和未完成连接队列之和的最大值 一般写128
```

#### accept函数

```c
#include <sys/socket.h>

int accept(int sockfd, struct sockaddr * _Nullable restrict addr,
  socklen_t * _Nullable restrict addrlen);
功能：
    从已完成连接队列提取新的连接，如果没有新的连接，accept会阻塞。
参数：
    sockfd:套接字
    addr:获取的客户端的ip和端口信息 ipv4套接字结构体
    addrlen:ipv4套接字结构体的大小的地址
返回值：
    新的已连接套接字的文件描述符
```

#### tcp服务器代码

```c
#include<stdio.h>
#include<arpa/inet.h>
#include<sys/socket.h>
#include<unistd.h>

int main(int argc,char *argv[]){
    //创建套接字
    int lfd=socket(AF_INET,SOCK_STREAM,0);
    //绑定
    struct sockaddr_in addr;
    addr.sin_family=AF_INET;
    addr.sin_port=htons(8000);
    //addr.sin_addr.s_addr=INADDR_ANY;//绑定的是通配地址，当前主机的所有ip
    inet_pton(AF_INET,"127.0.0.1",&addr.sin_addr.s_addr);
    int ret=bind(lfd,(struct sockaddr *)&addr,sizeof(addr));
    if(ret<0){
        perror("bind");
        exit(0);
    }
    //监听
    listen(lfd,128);
    //提取
    struct sockaddr_in cliaddr;
    socklen_t len=sizeof(cliaddr);
    int cfd=accept(lfd,(struct sockaddr *)&cliaddr,&len);
    char ip[16]="";
    printf("new client ip=%s port=%d\n",inet_ntop(AF_INET,&cliaddr.sin_addr.s_addr,ip,16),ntohs(cliaddr.sin_port));
    //读写
    char buf[1024]="";
    while(1){
        bzero(buf,sizeof(buf));
        int n=read(STDIN_FILENO,buf,sizeof(buf));
        write(cfd,buf,n);
        int readn=read(cfd,buf,sizeof(buf));
        if(readn==0){
            printf("客户端关闭");
        }
        printf("%s\n",buf);
    }
    //关闭
    close(lfd);
    close(cfd);
    return 0;
}
```

```bash
nc 127.0.0.1 8000 #可以实现一个客户端，简易聊天
hello
world
```

```bash
new client ip=127.0.0.1 port=52486
hello
world
```

### 多进程实现并发服务器

```c
#include <stdio.h>
#include<stdlib.h>
#include <sys/socket.h>
#include <unistd.h>
#include<signal.h>
#include<sys/types.h>
#include<sys/wait.h>
#include "wrap.h"
void free_process(int sig){
    pid_t pid;
    while(1){
        pid=waitpid(-1,NULL,WNOHANG);
        if(pid<=0){//小于0 子进程全部退出 =0没有子进程退出
            break;
            printf("haha");
        }else{
            printf("child pid =%d",pid);
        }
    }
    
}
int main(int argc, char *argv[])
{
    sigset_t set;
    sigemptyset(&set);
    sigaddset(&set,SIGCHLD);
    sigprocmask(SIG_BLOCK,&set,NULL);
    // 创建套接字
    int lfd = tcp4bind(8000, NULL);
    // 监听
    Listen(lfd, 128);
    // 提取
    // 回射
    struct sockaddr_in cliaddr;
    socklen_t len = sizeof(cliaddr);
    while (1)
    {
        char ip[16] = "";
        // 提取连接
        int cfd = Accept(lfd, (struct sockaddr *)&cliaddr, &len);
        printf("new client ip=%s port=%d\n", inet_ntop(AF_INET, &cliaddr.sin_addr.s_addr, ip, 16), ntohs(cliaddr.sin_port));
        // fork创建子进程
        pid_t pid;
        pid = fork();
        if (pid < 0)
        {
            perror("fork:");
            exit(0);
        }
        else if (pid == 0)
        { // 子进程
            // 关闭lfd
            close(lfd);
            while (1)
            {
                char buf[1024] = "";
                int n = read(cfd, buf, sizeof(buf));
                if (n < 0)
                {
                    perror("read:");
                    close(cfd);
                    exit(0);
                }
                else if (n == 0)
                { // 对方关闭
                    printf("client close\n");
                    close(cfd);
                    exit(0);
                }
                else
                {
                    printf("%s\n", buf);
                    write(cfd, buf, n);
                }
            }
        }
        else
        { // 父进程
            close(cfd);
            // 回收
            //注册信号回调
            struct sigaction act;
            act.sa_flags=0;
            act.sa_handler=free_process;
            sigemptyset(&act.sa_mask);
            sigaction(SIGCHLD,&act,NULL);
            sigprocmask(SIG_UNBLOCK,&set,NULL);
        }
    }
    // 关闭
    return 0;
}
```

我这里不知道为什么在子进程结束后回调函数没有触发。

### 多线程实现并发服务器

```c
#include<stdio.h>
#include<pthread.h>
#include"wrap.h"
typedef struct c_info{
    int cfd;
    struct sockaddr_in cliaddr;
}CINFO;
void *client_fun(void *arg);
int main(int argc,char *argv[]){
    if(argc<2){
        printf("argc<2\n");
        return 0;
    }
    //如果使用pthread_join或pthread_detach()回收资源要具体的线程id,太繁琐，
    //所以在创建线程时赋予detach属性
    pthread_attr_t attr;
    pthread_attr_init(&attr);
    pthread_attr_setdetachstate(&attr,PTHREAD_CREATE_DETACHED);
    short port=atoi(argv[1]);
    int lfd=tcp4bind(port,NULL);//创建套接字 绑定
    Listen(lfd,128);
    struct sockaddr_in cliaddr;
    socklen_t len=sizeof(cliaddr);
    CINFO *info;
    while(1){
        int cfd=Accept(lfd,(struct sockaddr *)&cliaddr,&len);
        
        //printf("new client ip=%s port=%d\n",inet_ntop(AF_INET,&cliaddr.sin_addr.s_addr,buf,16),ntohs(cliaddr.sin_port));
        pthread_t pthid;
        //这里如果CINFO info来用是不可以的，在多线程环境下，可能info里面的信息被覆盖，就不是原来的信息，所以放在堆区。
        info=malloc(sizeof(CINFO));
        info->cfd=cfd;
        info->cliaddr=cliaddr;
        pthread_create(&pthid,NULL,client_fun,info);
    }

    return 0;
}
void *client_fun(void *arg){
    CINFO *info=(CINFO *)arg;
    char buf[16]="";
    printf("new client ip=%s port=%d\n",inet_ntop(AF_INET,&(info->cliaddr.sin_addr.s_addr),buf,16),ntohs(info->cliaddr.sin_port));
    while(1){
        char buf[1024]="";
        int count=0;
        count=read(info->cfd,buf,sizeof(buf));
        if(count<0){
            perror("read:");
            break;
        }else if(count==0){
            printf("client close\n");
            break;
        }else{
            printf("%s\n",buf);
            write(info->cfd,buf,count);
        }
    }
    close(info->cfd);
    free(info);
}
```

## 高并发服务器

为了实现更好的并发：以下由三种方法

1. 阻塞等待：消耗资源，效率不高
2. 非阻塞忙轮询：消耗cpu
3. **多路IO转接(多路IO复用)：这种较为理想，epoll，select，poll都是 依赖 Linux 内核事件机制 实现的 I/O 多路复用模型，他们可以监听到任意socket的读写缓冲区发生了变化，应用层进而去处理。这样实现高并发。**

**多路IO转接服务器也叫做多任务IO服务器，该类服务器实现的主旨思想是，不再由应用程序自己监视客户端连接，而是由内核替应用程序监视**

**windows 使用select select跨平台**

**poll 用的较少**

**epoll linux**

### select

1. select能监听的文件描述符个数受限于FD_SETSIZE,一般为1024，单纯改变进程打开的文件描述符个数并不能改变select监听文件个数。
2. 解决1024以下客户端时使用select是很合适的，但如果链接客户端过多，**select采用的是轮询模型**，会大大降低服务器响应效率，不应在select上投入更多精力。

```c
#include <sys/select.h>

typedef /* ... */ fd_set;

int select(int nfds, fd_set * _Nullable restrict readfds,
  fd_set * _Nullable restrict writefds,
  fd_set * _Nullable restrict exceptfds,
  struct timeval * _Nullable restrict timeout);
功能：监听多个文件描述符的属性变化（读，写，异常）
参数：nfds:最大文件描述符+1
    readfds:需要监听的读的文件描述符存放集合
    writefds:需要监听的写的文件描述符存放集合 NULL
    exceptfds:需要监听的异常的文件描述符存放集合 NULL
    timeout：多长时间监听一次 固定的时间，限时等待 NULL 永久监听
返回值：返回的是变化的文件描述符的个数，变化的文件描述符会在readfds保存，但是没有变化的文件描述符会被删掉。
struct timeval {
  time_t tv_sec; /* seconds */
  suseconds_t tv_usec; /* microseconds */
};
void FD_CLR(int fd, fd_set * set);//从集合删除指定文件描述符
int FD_ISSET(int fd, fd_set * set);//文件描述符是否在集合，在就返回1
void FD_SET(int fd, fd_set * set);//向集合添加文件描述符
void FD_ZERO(fd_set * set);//清空文件描述符集
```

### 基于select的并发服务器

```c
#include<stdio.h>
#include<sys/select.h>
#include<sys/types.h>
#include<unistd.h>
#include"wrap.h"
#include<sys/time.h>
#define PORT 8888
int main(int argc,char *argv[]){
    //创建套接字，绑定
    int lfd=tcp4bind(PORT,NULL);
    //监听
    Listen(lfd,128);
    int maxfd=lfd;//最大的文件描述符
    fd_set oldset,rset;
    //清空集合
    FD_ZERO(&oldset);
    FD_ZERO(&rset);
    //将lfd添加到oldset集合中
    FD_SET(lfd,&oldset);
    while(1){
        rset=oldset;
        int n=select(maxfd+1,&rset,NULL,NULL,NULL);
        if(n<0){
            perror("select:");
            break;
        }else if(n==0){
            continue;
        }else{
            //监听到了文件描述符的变化
            //lfd 代表有新的连接到来
            if(FD_ISSET(lfd,&rset)){
                struct sockaddr_in cliaddr;
                socklen_t len=sizeof(cliaddr);
                char ip[16]="";
                //提取新的连接
                int cfd=Accept(lfd,(struct sockaddr*)&cliaddr,&len);
                printf("new client ip=%s port=%d\n",inet_ntop(AF_INET,&cliaddr.sin_addr.s_addr,ip,16),ntohs(cliaddr.sin_port));
                //将cfd添加至oldset集合中，以下次监听
                FD_SET(cfd,&oldset);
                //更新maxfd
                if(cfd>maxfd){
                    maxfd=cfd;
                }
                //如果只有lfd变化，continue
                if(--n==0){
                    continue;
                }
            }
            //cfd  遍历lfd之后的文件描述符是否在rset集合中，如果在则cfd变化
            for(int i=lfd+1;i<=maxfd;i++){
                if(FD_ISSET(i,&rset)){
                    char buf[1500]="";
                    int ret=Read(i,buf,sizeof(buf));
                    if(ret<0){//出错，将cfd关闭，从oldset删除cfd;
                        perror("Read");
                        close(i);
                        FD_CLR(i,&oldset);
                        continue;
                    }else if(ret==0){
                        printf("client close\n");
                        close(i);
                        FD_CLR(i,&oldset);
                    }else{
                        printf("%s\n",buf);
                        Write(i,buf,ret);
                    }
                }
            }
        }
    }
}
```

```bash
new client ip=127.0.0.1 port=54938
hello

client close
```

**select的优缺点：**

**优点：跨平台**

**缺点：**

**文件描述符1024的限制 由于FD_SETSIZE的限制。只是返回变化的文件描述符的个数，具体是哪些变化，需要遍历。**

**每次都需要将需要监听的文件描述符集合由应用层拷贝到内核，也比较费时间。**

**当大量并发，少量活跃，select效率低。**

**假设现在4-1023个文件描述符需要监听，但是5-1000这些文件描述符关闭了？**

**列一个数组存储监听的文件描述符列表，文件描述符关闭就把他的值从数组覆盖掉，再确认那些文件描述符读或写，直接遍历这个数组，效率高些，但是还是很一般。**

**其实我们可以在文件描述符表把后面的文件描述符提前，让文件描述符更紧凑，这样效率更高，我们可以使用dup2函数把前面空余的文件描述符复制后面的，再把后面的关掉。**

**假设4-1023个文件描述符需要监听，但是只有5，1002发来消息：无解**

### poll

```c
#include <poll.h>
int poll(struct pollfd * fds, nfds_t nfds, int timeout);
功能：监听多个文件描述符的属性变化
参数:
	fds:监听的数组首元素地址
    nfds:数组有效元素的最大下标+1
    timeout:超时时间 -1是永久监听 >=0限时等待
数组元素：struct pollfd
struct pollfd {
  int fd; /* file descriptor */ 需要监听的文件描述符
  short events; /* requested events */ 需要监听的文件描述符什么事件 POLLIN 读事件 POLLOUT 写事件
  short revents; /* returned events */ 返回监听到的事件
};        
```

**poll相对于select的优缺点：**

**优点：**

**没有文件描述符1024的限制**

**请求和返回是分离的**

**缺点和select一样：**

**每次都需要将需要监听的文件描述符从应用层拷贝到内核**

**每次都需要将数组的元素遍历一遍才知道那一个文件描述符变化了**

**大量并发，少量活跃，效率低。**

### epoll

![12](Linux网络编程/12.png)

**红黑树的节点不只是文件描述符。**

**epoll API**

**1.创建红黑树**

```c
#include <sys/epoll.h>
int epoll_create(int size);
参数：
    size:监听的文件描述符上限，2.6版本之后写1即可会自动扩展
返回值：
    返回树的句柄
```

**2.上树 下树 修改节点**

```c
#include <sys/epoll.h>
int epoll_ctl(int epfd, int op, int fd,
  struct epoll_event * _Nullable event);
参数：
    epfd:树的句柄
    op:选项：EPOLL_CTL_ADD 上树 EPOLL_CTL_MOD 修改节点 EPOLL_CTL_DEL 下树
    fd:上树下树的文件描述符
    event:上树的节点
 struct epoll_event {
   uint32_t events; /* Epoll events */ 需要监听的事件 EPOLLIN　读事件　EPOLLOUT 写事件
   epoll_data_t data; /* User data variable */ 需要监听的文件描述符
 };

 union epoll_data {
   void * ptr;
   int fd;
   uint32_t u32;
   uint64_t u64;
 };

 typedef union epoll_data epoll_data_t;
```

**3.监听**

```c
#include <sys/epoll.h>
int epoll_wait(int epfd, struct epoll_event * events,
  int maxevents, int timeout);
功能：监听树上文件描述符的变化
参数：
	epfd:树的句柄
    events：接收变化节点的数组的首地址
    maxevents：数组元素的个数
    timeout：-1 永久监听 大于等于0限时等待
返回值：
    返回的是变化的文件描述符个数
```

示例代码：父子进程通过管道通信

```c
#include<stdio.h>
#include<unistd.h>
#include<string.h>
#include<sys/epoll.h>
#include <sys/types.h> 
int main(int argc,char *argv[]){
    int fd[2];
    pipe(fd);
    //创建子进程
    pid_t pid;
    pid=fork();
    if(pid<0){
        perror("fork:");
        return 1;
    }else if(pid==0){
        close(fd[0]);
        char buf[5];
        char ch='a';
        while(1){
            sleep(3);
            memset(buf,ch++,sizeof(buf));
            write(fd[1],buf,5);
        }
    }else{
        close(fd[1]);
        //创建树
        int epfd=epoll_create(1);
        //上树
        struct epoll_event ev,evs[1];
        ev.data.fd=fd[0];
        ev.events=EPOLLIN;
        epoll_ctl(epfd,EPOLL_CTL_ADD,fd[0],&ev);
        //监听
        while(1){
            int n=epoll_wait(epfd,evs,1,-1);
            if(n==1){
                char buf[128]="";
                int ret=read(fd[0],buf,sizeof(buf));
                if(ret<=0){
                    close(fd[0]);
                    epoll_ctl(epfd,EPOLL_CTL_DEL,fd[0],&ev);
                    break;
                }else{
                    printf("%s\n",buf);
                }
            }
        }
    }
    return 0;
}
```

```bash
aaaaa
bbbbb
ccccc
ddddd
eeeee
fffff
ggggg
hhhhh
```

### 基于epoll的高并发服务器

```c
#include<stdio.h>
#include"wrap.h"
#include<sys/epoll.h>

int main(int argc,char *argv[]){
    //创建套接字 绑定
    int lfd=tcp4bind(8000,NULL);
    //监听
    Listen(lfd,128);
    //创建树
    int epfd=epoll_create(1);
    //将lfd上树
    struct epoll_event ev,evs[1024];
    ev.data.fd=lfd;
    ev.events=EPOLLIN;
    epoll_ctl(epfd,EPOLL_CTL_ADD,lfd,&ev);
    //while监听
    while(1){
        int nready=epoll_wait(epfd,evs,1024,-1);
        if(nready<0){
            perror("epoll_wait:");
            break;
        }else if(nready==0){
            continue;
        }else{
            for(int i=0;i<nready;i++){
                //判断lfd变化，并且是读事件变化
                if(evs[i].data.fd==lfd&&evs[i].events & EPOLLIN){
                    struct sockaddr_in cliaddr;
                    char ip[16]="";
                    socklen_t len=sizeof(cliaddr);
                    //提取新的连接
                    int cfd=Accept(lfd,(struct sockaddr*)&cliaddr,&len);
                    printf("new client ip=%s port=%d\n",inet_ntop(AF_INET,&cliaddr.sin_addr.s_addr,ip,16),ntohs(cliaddr.sin_port));
                    //将cfd上树
                    ev.data.fd=cfd;
                    ev.events=EPOLLIN;
                    epoll_ctl(epfd,EPOLL_CTL_ADD,cfd,&ev);
                }else if(evs[i].events & EPOLLIN)//cfd变化,而且是读事件变化
                {
                    char buf[1024]="";
                    int n=read(evs[i].data.fd,buf,sizeof(buf));
                    if(n<0){
                        perror("read:");
                        epoll_ctl(epfd,EPOLL_CTL_DEL,evs[i].data.fd,&evs[i]);
                    }else if(n==0){//客户端关闭
                        printf("client close");
                        close(evs[i].data.fd);
                        epoll_ctl(epfd,EPOLL_CTL_DEL,evs[i].data.fd,&evs[i]);
                    }else{
                        printf("%s\n",buf);
                        write(evs[i].data.fd,buf,n);
                    }
                }
            }
        }
    }
    return 0;
}
```

```bash
new client ip=127.0.0.1 port=56746
hello
```

### epoll的两种工作方式

**在电路中，存在高电平和低电平，水平触发：持续的高电平或者低电平。边沿触发：电平有高到低的一个变化 或者由低到高的变化。对于epoll_wait的水平触发 LT，边沿触发 ET,对于读缓冲区使用水平触发，epoll_wait(系统调用)触发很频繁，所以使用边沿触发。写缓冲区一般用边沿触发**



![13](Linux网络编程/13.png)



**如何使用边沿触发呢，读缓冲区默认是水平触发。我们可以在上树时，需要设置需要监听的事件，再加上个EPOLLET**

```c
ev.events=EPOLLIN | EPOLLET
```

### 基于epoll的高并发服务器(加入边沿触发和优化代码)

将cfd设置边沿触发。设置边沿触发就要非阻塞。

```c
#include <stdio.h>
#include "wrap.h"
#include <sys/epoll.h>
#include <sys/fcntl.h>
int main(int argc, char *argv[])
{
    // 创建套接字 绑定
    int lfd = tcp4bind(8000, NULL);
    // 监听
    Listen(lfd, 128);
    // 创建树
    int epfd = epoll_create(1);
    // 将lfd上树
    struct epoll_event ev, evs[1024];
    ev.data.fd = lfd;
    ev.events = EPOLLIN;
    epoll_ctl(epfd, EPOLL_CTL_ADD, lfd, &ev);
    // while监听
    while (1)
    {
        int nready = epoll_wait(epfd, evs, 1024, -1);
        printf("epoll_wait .........................\n");
        if (nready < 0)
        {
            perror("epoll_wait:\n");
            break;
        }
        else if (nready == 0)
        {
            continue;
        }
        else
        {
            for (int i = 0; i < nready; i++)
            {
                // 判断lfd变化，并且是读事件变化
                if (evs[i].data.fd == lfd && evs[i].events & EPOLLIN)
                {
                    struct sockaddr_in cliaddr;
                    char ip[16] = "";
                    socklen_t len = sizeof(cliaddr);
                    // 提取新的连接
                    int cfd = Accept(lfd, (struct sockaddr *)&cliaddr, &len);
                    printf("new client ip=%s port=%d\n", inet_ntop(AF_INET, &cliaddr.sin_addr.s_addr, ip, 16), ntohs(cliaddr.sin_port));
                    // 设置cfd为非阻塞
                    int flags = fcntl(cfd, F_GETFL); // 获取cfd的标志位
                    flags |= O_NONBLOCK;
                    fcntl(cfd, F_SETFL, flags);
                    // 将cfd上树
                    ev.data.fd = cfd;
                    ev.events = EPOLLIN | EPOLLET;
                    epoll_ctl(epfd, EPOLL_CTL_ADD, cfd, &ev);
                }
                else if (evs[i].events & EPOLLIN) // cfd变化,而且是读事件变化
                {
                    while (1)
                    {   //使用循环读，因为cfd采用的边沿模式读，一次可能读不完需要循环读保证读完
                        //但是read循环读的话会产生阻塞，这个程序就无法监听了，所以设置cfd为非阻塞
                        char buf[4] = "";
                        //如果读一个缓冲区，缓冲区没有数据，如果是带阻塞，就阻塞等待
                        //如果是非阻塞，返回值就等于-1,并且会将errno的值置为EAGAIN
                        //所以在非阻塞这里就出现问题了，n<0,可能是出错或者没有数据，没有数据不必下树，退出循环读。出错下树
                        int n = read(evs[i].data.fd, buf, sizeof(buf));
                        if (n < 0)
                        {
                            //缓冲区读干净了，跳出读循环
                            if(errno==EAGAIN){
                                break;
                            }
                            //普通错误
                            perror("read:");
                            epoll_ctl(epfd, EPOLL_CTL_DEL, evs[i].data.fd, &evs[i]);
                            close(evs[i].data.fd);
                            break;
                        }
                        else if (n == 0)
                        { // 客户端关闭
                            printf("client close");
                            close(evs[i].data.fd);
                            epoll_ctl(epfd, EPOLL_CTL_DEL, evs[i].data.fd, &evs[i]);
                            break;
                        }
                        else
                        {
                            //这里为什么不用printf了呢，因为printf输出字符串时，会去找字符串结束的\0但是网络传输收到的是没有\0(需要主动方手动添加)
                            //没有\0,printf就会出错，但是使用write函数就不会
                            write(STDOUT_FILENO,buf,n);
                            write(evs[i].data.fd, buf, n);
                        }
                    }
                }
            }
        }
    }
    return 0;
}
```

### epoll反应堆Reactor

**epoll反应堆就是把这三个东西：文件描述符 事件 回调函数封装在一起。**

**结构体来封装。**

反应堆模式（Reactor Pattern）是一种事件驱动的设计模式，用于处理并发 I/O 操作。核心思想：

- **事件驱动**：等待多个事件（如网络连接的读写事件）发生；
- **事件分发**：事件就绪时，分发给相应的处理器执行；
- **非阻塞 I/O**：避免线程阻塞，提高资源利用率。

###  线程池

**线程池，事先创建几个线程，不停取任务，如果没有任务休眠，省去了不停的创建线程销毁线程的事件和资源**

**注意：线程池 处理的单个任务所需要处理的时间必须很短。**

**一个锁**

**两个条件变量**

**循环队列**

![14](Linux网络编程/14.png)

## libevent

`libevent` 是一个 **高性能事件通知库**，用于在不同平台上进行 **异步事件驱动编程**，特别适合开发网络服务（如 HTTP 服务器、聊天服务等）。它封装了底层的 `select`、`poll`、`epoll`、`kqueue` 等系统调用，提供了统一、跨平台的接口。

### libevent事件触发流程

![15](Linux网络编程/15.png)

### libevent的使用

```c
创建event_base根节点
struct event_base *event_base_new(void);
返回值就是event_base根节点，因为libevent底层默认使用epoll,所以定义了一个自己封装的节点
释放根节点
void event_base_free(struct event_base *);
循环监听
int event_base_dispatch(struct event_base *base);
相当于while(1){epoll_wait()}//循环监听
退出循环监听
int event_base_loopexit(struct event_base *base,const struct timeval*tv);//等待固定时间退出
int event_base_loopbreak(struct event_base *base);//立即退出
```

```c
初始化上树节点
struct event*event_new(struct event_base *base,evutil_socket_t fd,
                       short events,event_callback_fn cb,void *arg);
参数：
    base:event_base根节点
    fd:上树的文件描述符
    events:监听的事件 EV_TIMEOUT 超时事件 EV_READ 读事件 EV_WRITE 写事件 EV_SIGNAL 信号事件 EV_PERSIST 周期性触发
   	cb:回调函数
       typedef void (*event_callback_fn)(evutil_socket_t fd,short events,void *arg);
返回值:初始化好的节点的地址        
```

```c
节点上树
int event_add(struct event*ev,const struct timeval *timeout);
参数:
	ev:上树节点的地址
    timeout:NULL 永久监听 固定时间 限时等待
```

```c
节点下树
int event_del(struct event *ev);
参数：
    ev:下树节点的地址
```

```c
释放节点
void event_free(struct event *ev);
```

### libevent编写tcp服务器代码

创建套接字

绑定

监听

创建event_base根节点

初始上树节点 lfd

上树

循环监听

收尾

```c
#include<stdio.h>
#include"wrap.h"
#include<event.h>
void cfdcb(int cfd,short event,void *arg){
    char buf[1500]="";
    int n=Read(cfd,buf,sizeof(buf));
    if(n<=0){
        perror("err or close");
       // event_del()
    }
    else{
        printf("%s\n",buf);
        Write(cfd,buf,n);
    }
}
void lfdcb(int lfd,short event,void *arg){
    struct event_base *base=(struct event_base *)arg;
    //提取新的cfd
    int cfd=Accept(lfd,NULL,NULL);
    //cfd初始化
    struct event *ev=event_new(base,cfd,EV_READ|EV_PERSIST,cfdcb,NULL);
    //cfd上树
    event_add(ev,NULL);
}
int main(){
    //创建套接字
    //邦定
    int lfd=tcp4bind(8000,NULL);
    //监听
    Listen(lfd,128);
    //创建event_base根节点
    struct event_base *base=event_base_new();
    //初始化lfd上树节点
    struct event *ev=event_new(base,lfd,EV_READ|EV_PERSIST,lfdcb,base);
    //上树
    event_add(ev,NULL);
    //监听
    event_base_dispatch(base);//阻塞
    //收尾
    event_free(ev);
    close(lfd);
    return 0;
}
```

**在下树的时候有问题，下树时需要所属的struct event *ev，但是回调函数也是在event_new函数执行后注册，但是那个时候ev还没有生成，所以不能依靠传参，所以我们要定义一个全局数组，数组成员是自定义结构体包含fd和ev,ev生成后放进数组里，执行读回调后，通过fd查找对应得ev下树。**

**还有一种就是不用定义数组，直接自定义结构体包含fd和ev传过去。结构体在传之前先malloc,直接定义会因为函数结束而被释放。之前是因为修改的是ev,传的也是ev冲突了，这下改成传的是结构体指针，改的结构体的ev,这不冲突，所以可行。**

### bufferevent事件

**普通的event事件  文件描述符  事件(底层缓冲区的读事件或者写事件)触发  回调**

**高级的event事件 bufferevent事件**

**bufferevent = 封装好的一套“异步读写 + 自动缓冲 + 错误处理 + 回调触发 + 高并发”解决方案，是 libevent 最推荐用的通信组件。**

不同点

![16](Linux网络编程/16.png)

核心：一个文件描述符 两个缓冲区 三个回调

### bufferevent监听流程

![17](Linux网络编程/17.png)

### bufferevent API

```c
创建新的节点
struct bufferevent *bufferevent_socket_new(
    struct event_base *base,
    evutil_socket_t fd,
    int options
);
参数：
    base:event_base 根节点
    fd:要初始化上树的文件描述符
    options:BEV_OPT_CLOSE_ON_FREE	在 bufferevent_free() 时自动关闭 socket（常用）
        	BEV_OPT_THREADSAFE	让 bufferevent 在多线程中线程安全
返回值：新建节点的地址
```

```c
设置节点的回调
void bufferevent_setcb(
    struct bufferevent *bev,
    bufferevent_data_cb readcb,
    bufferevent_data_cb writecb,
    bufferevent_event_cb eventcb,
    void *cbarg
);
参数:
	bev:新建的节点的地址
    readcb:读回调
    writecb:写回调
    eventcb：异常回调
    cbarg：传给回调函数的参数
    回调函数：
    typedef void (*bufferevent_data_cb)(struct bufferevent *bev, void *ctx);//读写回调
	typedef void (*bufferevent_event_cb)(struct bufferevent *bev, short events, void *ctx);//事件回调
	事件回调 events会写明触发回调的原因
```

```c
让事件使能
int bufferevent_enable(struct bufferevent *bev, short events);
int bufferevent_disable(struct bufferevent *bev, short events);
参数：
    bev:新建的节点的地址
    events:使生效或使失效的事件 EV_READ EV_WRITE
```

```c
发送数据
将数据写入 bufferevent 的输出缓冲区，异步发送（不会立即写到 socket 上）发送后会触发回调
int bufferevent_write(struct bufferevent *bev, const void *data, size_t size);
```

```c
接受数据
size_t bufferevent_read(struct bufferevent *bev, void *data, size_t size);
将从 bev 的读缓冲区中读取最多 size 字节的数据，复制到 data。同时将读到的数据从bufferevent的读缓冲区清除
返回实际读取的字节数。    
```

```c
连接侦听器
创建套接字 绑定 监听 提取
struct evconnlistener *evconnlistener_new_bind(
    struct event_base *base,
    evconnlistener_cb cb,
    void *ctx,
    unsigned flags,
    int backlog,
    const struct sockaddr *sa,
    int socklen
);
参数：
    base：根节点
    cb:提取套接字cfd（连接到来）调用的回调
        回调函数：
        typedef void evconnlistener_cb(
            struct evconnlistener *listener,
            evutil_socket_t fd,
            struct sockaddr *addr,
            int socklen,
            void *ctx
        );
		参数：
            listener：连接侦听器的地址
            fd：提取后的新文件描述符cfd
            addr:客户端的地址信息
            socklen：addr的大小
            ctx：evconnlistener_new_bind传给回调函数的参数
    ctx:传给回调函数的参数
    flags:
        LEV_OPT_CLOSE_ON_FREE	关闭时自动释放（推荐）
        LEV_OPT_REUSEABLE	设置 SO_REUSEADDR 端口复用（推荐）
        LEV_OPT_THREADSAFE	线程安全
        LEV_OPT_LEAVE_SOCKETS_BLOCKING  文件描述符为阻塞的
    backlog:-1 监听队列长度自动填充
    sa：绑定的地址信息
    socklen：sa的大小     
返回值：连接侦听器的地址
```

```c
这个是用来写tcp客户端的
创建套接字 连接服务器
但是要先有节点
struct bufferevent *bufferevent_socket_new(
    struct event_base *base,
    evutil_socket_t fd,
    int options
);这里fd为-1.    
int bufferevent_socket_connect(
    struct bufferevent *bev,
    const struct sockaddr *address,
    int addrlen
);
参数：
    bev:新建的节点
    address:服务器的地址信息
    addrlen：address长度
```

### 基于hello-world.c的服务端代码

```c
/*
  This example program provides a trivial server program that listens for TCP
  connections on port 9995.  When they arrive, it writes a short message to
  each client connection, and closes each connection once it is flushed.

  Where possible, it exits cleanly in response to a SIGINT (ctrl-c).
*/


#include <string.h>
#include <errno.h>
#include <stdio.h>
#include <signal.h>
#ifndef _WIN32
#include <netinet/in.h>
# ifdef _XOPEN_SOURCE_EXTENDED
#  include <arpa/inet.h>
# endif
#include <sys/socket.h>
#endif

#include <event2/bufferevent.h>
#include <event2/buffer.h>
#include <event2/listener.h>
#include <event2/util.h>
#include <event2/event.h>

static const char MESSAGE[] = "Hello, World!\n";

static const int PORT = 9995;

static void listener_cb(struct evconnlistener *, evutil_socket_t,
    struct sockaddr *, int socklen, void *);
static void conn_writecb(struct bufferevent *, void *);
static void conn_eventcb(struct bufferevent *, short, void *);
static void conn_readcb(struct bufferevent *, void *);
static void signal_cb(evutil_socket_t, short, void *);

int
main(int argc, char **argv)
{
	struct event_base *base;//创建根节点
	struct evconnlistener *listener;
	struct event *signal_event;

	struct sockaddr_in sin = {0};
#ifdef _WIN32
	WSADATA wsa_data;
	WSAStartup(0x0201, &wsa_data);
#endif

	base = event_base_new();
	if (!base) {
		fprintf(stderr, "Could not initialize libevent!\n");
		return 1;
	}

	sin.sin_family = AF_INET;
	sin.sin_port = htons(PORT);

	//创建连接侦听器
	listener = evconnlistener_new_bind(base, listener_cb, (void *)base,
	    LEV_OPT_REUSEABLE|LEV_OPT_CLOSE_ON_FREE, -1,
	    (struct sockaddr*)&sin,
	    sizeof(sin));

	if (!listener) {
		fprintf(stderr, "Could not create a listener!\n");
		return 1;
	}
	//创建信号触发的节点
	signal_event = evsignal_new(base, SIGINT, signal_cb, (void *)base);
	//将信号节点上树
	if (!signal_event || event_add(signal_event, NULL)<0) {
		fprintf(stderr, "Could not create/add a signal event!\n");
		return 1;
	}

	event_base_dispatch(base);//循环监听

	evconnlistener_free(listener);//释放连接侦听器
	event_free(signal_event);//释放信号节点
	event_base_free(base);//释放event_base根节点

	printf("done\n");
	return 0;
}

static void
listener_cb(struct evconnlistener *listener, evutil_socket_t fd,
    struct sockaddr *sa, int socklen, void *user_data)
{
	struct event_base *base = user_data;
	struct bufferevent *bev;
	//将fd上树
	//新建一个bufferevent节点
	bev = bufferevent_socket_new(base, fd, BEV_OPT_CLOSE_ON_FREE);
	if (!bev) {
		fprintf(stderr, "Error constructing bufferevent!");
		event_base_loopbreak(base);
		return;
	}
	//设置回调
	bufferevent_setcb(bev, conn_readcb, conn_writecb, conn_eventcb, NULL);
	bufferevent_enable(bev, EV_WRITE | EV_READ);//设置读写事件使能
	//bufferevent_disable(bev, EV_READ);//设置读事件非使能

	//bufferevent_write(bev, MESSAGE, strlen(MESSAGE));//给cfd发送消息 hello world
}
static void
conn_readcb(struct bufferevent *bev, void *user_data){
	char buf[1500]="";
	int n=bufferevent_read(bev,buf,sizeof(buf));
	//不用担心出错，出错会触发事件回调
	printf("%s\n",buf);
	bufferevent_write(bev, buf,n);//给cfd发送消息
}
static void
conn_writecb(struct bufferevent *bev, void *user_data)
{
	struct evbuffer *output = bufferevent_get_output(bev);//获取缓冲区类型
	if (evbuffer_get_length(output) == 0) {//判断==0则应用层缓冲区为空，发送完毕
		//printf("flushed answer\n");
		//bufferevent_free(bev);//释放节点 自动关闭连接
	}
}

static void
conn_eventcb(struct bufferevent *bev, short events, void *user_data)
{
	if (events & BEV_EVENT_EOF) {
		printf("Connection closed.\n");
	} else if (events & BEV_EVENT_ERROR) {
		printf("Got an error on the connection: %s\n",
		    strerror(errno));/*XXX win32*/
	}
	/* None of the other events can happen here, since we haven't enabled
	 * timeouts */
	bufferevent_free(bev);
}

static void
signal_cb(evutil_socket_t sig, short events, void *user_data)
{
	struct event_base *base = user_data;
	struct timeval delay = { 2, 0 };

	printf("Caught an interrupt signal; exiting cleanly in two seconds.\n");

	event_base_loopexit(base, &delay);//退出循环监听
}
```

## webserver服务器流程

![18](Linux网络编程/18.png)

### html

html 超文本标签语句(超文本标记语言)

```html
<html>
    <head>
        <meta http-equiv="content-Type" content="text/html;charset=utf8">
        <title>我是一个html</title>
        <body>
            <font size='7' color="red">hello world</font>
            <br/>
            <font size='7' color="red">hello world</font>
        </body>
    </head>
</html>
```

### HTTP协议

http请求

```bash
请求行：GET /demo.html HTTP/1.1\r\n

		请求方式  /请求的内容   版本\r\n

请求头
空行\r\n
数据
```

| 部分       | 内容示例                                                     |
| ---------- | ------------------------------------------------------------ |
| **请求行** | `GET /index.html HTTP/1.1`包含：方法、请求目标路径、HTTP版本号 |
| **请求头** | 一组键值对，每行一个，例如：`Host: www.example.com``User-Agent: curl/7.81.0` |
| **空行**   | 请求头与请求体之间必须有一个空行                             |
| **请求体** | （可选）提交的数据，比如表单、JSON、文件上传等               |

http应答

```bash
状态行：HTTP/1.1 200 OK\r\n
		版本    状态码 状态信息\r\n
消息报头：
	文件类型（必填的）
	文件的长度（可填可不填，填了要求一定对）
空行\r\n
发送文件
```

| 部分       | 示例与说明                                                   |
| ---------- | ------------------------------------------------------------ |
| **状态行** | `HTTP/1.1 200 OK`包含：协议版本、状态码、状态短语            |
| **响应头** | 键值对形式，如：`Content-Type: text/html``Content-Length: 123` |
| **空行**   | 用于分隔响应头和响应体                                       |
| **响应体** | 实际返回的内容，如网页HTML、JSON数据、图片等（可选）         |

状态码

| 状态码 | 名称                  | 含义描述                                                     |
| ------ | --------------------- | ------------------------------------------------------------ |
| 200    | OK                    | 请求成功，服务器正常返回了请求的数据。                       |
| 301    | Moved Permanently     | 资源已永久移动到新位置，浏览器会自动跳转，搜索引擎会更新索引。 |
| 302    | Found                 | 资源临时移动，原 URL 仍然有效，浏览器会自动跳转。            |
| 400    | Bad Request           | 请求语法错误或参数无效，服务器无法理解请求。                 |
| 401    | Unauthorized          | 请求需要身份认证（未登录或 token 无效）。                    |
| 403    | Forbidden             | 已认证但没有权限访问该资源。                                 |
| 404    | Not Found             | 请求的资源不存在，可能是 URL 错误或资源已删除。              |
| 500    | Internal Server Error | 服务器内部错误，可能是代码异常或服务器故障。                 |

读取目录下的所有文件名

以前用readdir函数，还有一个scandir

```c
#include <dirent.h>
struct dirent {
  ino_t d_ino; /* Inode number */
  off_t d_off; /* Not an offset; see below */
  unsigned short d_reclen; /* Length of this record */
  unsigned char d_type;
  /* Type of file; not supported
                                          by all filesystem types */
  char d_name[256]; /* Null-terminated filename */
};
struct dirent **mylist;
int scandir(const char * restrict dirp,
  struct dirent ** * restrict namelist,
  int( * filter)(const struct dirent * ),
  int( * compar)(const struct dirent ** ,
    const struct dirent ** ));
参数:
	dirp：目录下的路径名
    namelist：mylist地址
    filter：过滤的函数入口地址
    compar：排序函数入口地址 alphasort(字母排序)  
返回值：读取文件的个数
```

### webserver代码（基于epoll）

```c
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include "wrap.h"
#include <sys/epoll.h>
#include <sys/fcntl.h>
#include <sys/stat.h>
#include<dirent.h>
#include<signal.h>
#define PORT 8889
void send_header(int cfd, int code, char *info, char *filetype, int length)
{
    // 发送状态行
    char buf[1024] = "";
    int len = sprintf(buf, "HTTP/1.1 %d %s\r\n", code, info);
    send(cfd, buf, len, 0);
    // 发送消息头
    len = sprintf(buf, "Content-Type:%s\r\n", filetype);
    send(cfd, buf, len, 0);
    if (length > 0)
    {
        len = sprintf(buf, "Content-Length:%d\r\n", length);
        send(cfd, buf, len, 0);
    }
    // 空行
    send(cfd, "\r\n", 2, 0);
}
void send_file(int cfd, char *path, struct epoll_event *ev, int epfd, int flag)
{
    int fd = open(path, O_RDONLY);
    if (fd < 0)
    {
        perror("");
        return;
    }
    char buf[1024] = "";
    int len = 0;
    while (1)
    {
        len = read(fd, buf, sizeof(buf));
        if (len < 0)
        {
            perror("");
            break;
        }
        else if (len == 0)
        {
            break;
        }
        else
        {
            send(cfd, buf, len, 0);
            //这里发送大文件时会出现无法播放的问题，写缓冲区可能满，写不进去，
            //写不进去，监听EPOLLOUT,将没有发送的数据保存，等写事件触发，写出去
            //消息存储未发送的数据 
            //libevent库的bufferevent可以解决
        }
    }
    close(fd);
    // 关闭cfd,下树
    if (flag == 1)
    {
        close(cfd);
        epoll_ctl(epfd, EPOLL_CTL_DEL, cfd, ev);
    }
}
void read_client_request(int epfd, struct epoll_event *ev)
{
    // 读取请求（先读取一行，在把其他行读取，扔掉）
    char buf[1024] = "";
    char tmp[1024] = "";
    int n = Readline(ev->data.fd, buf, sizeof(buf));
    if (n <= 0)
    {
        printf("close or err\n");
        epoll_ctl(epfd, EPOLL_CTL_DEL, ev->data.fd, ev);
        close(ev->data.fd);
        return;
    }
    printf("%s\n", buf);
    int ret = 0;
    while ((ret = Readline(ev->data.fd, tmp, sizeof(tmp))) > 0);
    // printf("read ok\n");
    // 解析请求行 GET /a.txt HTTP/1.1\r\n
    char method[256] = "";
    char content[256] = "";
    char protocol[256] = "";
    sscanf(buf, "%[^ ] %[^ ] %[^ \r\n]", method, content, protocol);
    printf("[%s] [%s] [%s]\n", method, content, protocol);
    // 判断是否为get请求，get请求才处理
    if (strcasecmp(method, "get") == 0)
    { // 这个函数比较忽略大小写
        char *strfile = content + 1;
        //在请求阶段注意如果传过来的是中文，中文是一堆十六进制（URL编码），需要转换才能使用
        //传过来后必须把按十六进制转换成十进制，一个字节一个字节的转，最后拼在一起放在字符串中即可使用
        // 如果没有请求文件，默认请求工作目录
        // 得到浏览器请求的文件 如果对方没有请求文件 默认请求 ./
        if (*strfile == 0)
        {
            strfile = "./";
        }
        // 判断请求的文件在不在
        // 判断文件是否存在,如果存在（发送普通文件，目录）
        struct stat s;
        if (stat(strfile, &s) < 0)
        { // 文件不存在
            printf("file not found\n");
            // 先发送 报头(状态行 消息头 空行)
            send_header(ev->data.fd, 404, "Not Found", "/text/html", 0);
            // 发送文件 发送error.html
            send_file(ev->data.fd, "client.c", ev, epfd,1);
        }
        else
        {
            // 请求的是一个普通文件
            if (S_ISREG(s.st_mode))
            {
                printf("file\n");
                // 先发送 报头(状态行 消息头 空行)
                send_header(ev->data.fd, 200, "ok", "/text/html", 0);
                // 发送文件
                send_file(ev->data.fd, strfile, ev, epfd,1);
            }
            else if (S_ISDIR(s.st_mode))
            { // 请求的是一个目录
                printf("dir\n");
                // 发送一个列表 网页
                // 先发送 报头(状态行 消息头 空行)
                send_header(ev->data.fd, 200, "ok", "/text/html", 0);
                // 发送header.html
                send_file(ev->data.fd, "dir_header.html", ev, epfd,0);
                //发送列表
                struct dirent **mylist=NULL;
                int n=scandir(strfile,&mylist,NULL,alphasort);
                char buf[1024]="";
                int len=0;
                for(int i=0;i<n;i++){
                    printf("%s\n",mylist[i]->d_name);
                    if(mylist[i]->d_type==DT_DIR){
                        len=sprintf(buf,"<li><a href=%s/ >%s</a><li>",mylist[i]->d_name,mylist[i]->d_name);
                    }else
                    {
                        len=sprintf(buf,"<li><a href=%s>%s</a><li>",mylist[i]->d_name,mylist[i]->d_name);
                    }
                    send(ev->data.fd,buf,len,0);
                    free(mylist[i]);
                }
                free(mylist);

                send_file(ev->data.fd, "dir_tail.html", ev, epfd,1);
            }
        }
    }
}
int main()
{
    //忽略这个信号，为了解决在浏览器请求大文件，服务器有时会关闭的问题，
    //因为有的浏览器会把读端关闭，导致服务端无法写
    signal(SIGPIPE,SIG_IGN);
    // 切换工作目录
    // 获取当前目录的工作路径
    char pwd_path[256] = "";
    char *path = getenv("PWD");
    strcpy(pwd_path, path);
    strcat(pwd_path, "/web-http");
    // 切换工作目录
    chdir(pwd_path);
    // 创建套接字 绑定
    int lfd = tcp4bind(PORT, NULL);
    // 监听
    Listen(lfd, 128);
    // 创建树
    int epfd = epoll_create(1);
    // 将lfd上树
    struct epoll_event ev, evs[1024];
    ev.data.fd = lfd;
    ev.events = EPOLLIN;
    epoll_ctl(epfd, EPOLL_CTL_ADD, lfd, &ev);
    // 循环监听
    while (1)
    {
        int nready = epoll_wait(epfd, evs, 1024, -1);
        if (nready < 0)
        {
            perror("");
            break;
        }
        else
        {
            for (int i = 0; i < nready; i++)
            {
                // 判断是否是lfd
                if (evs[i].data.fd == lfd && evs[i].events & EPOLLIN)
                {
                    struct sockaddr_in cliaddr;
                    char ip[16] = "";
                    socklen_t len = sizeof(cliaddr);
                    int cfd = Accept(lfd, (struct sockaddr *)&cliaddr, &len);
                    printf("new client ip=%s port=%d\n", inet_ntop(AF_INET, &cliaddr.sin_addr.s_addr, ip, 16), ntohs(cliaddr.sin_port));
                    // 设置cfd为非阻塞
                    int flag = fcntl(cfd, F_GETFL);
                    flag |= O_NONBLOCK;
                    fcntl(cfd, F_SETFL, flag);
                    // 上树
                    ev.data.fd = cfd;
                    ev.events = EPOLLIN;
                    epoll_ctl(epfd, EPOLL_CTL_ADD, cfd, &ev);
                }
                else if (evs[i].events & EPOLLIN) // cfd变化
                {
                    read_client_request(epfd, &evs[i]);
                }
            }
        }
    }
    // 收尾
}
```

**这个代码还有URL转码，函数没有实现。发送大文件，无法传输的问题，已写明解决方法（基于bufferevent）。**

**为什么服务端 `send()` 写不进去，错误是“写缓冲区满”，难道不是因为“客户端浏览器的读缓冲区满”吗？**

正确解释如下：send() 写的是 **内核发送缓冲区**

当你调用 `send(fd, buf, len, 0)` 时：

- 数据不是直接“发到浏览器”，而是先写入 **服务端内核的 socket 发送缓冲区**；
- **只有写进这个缓冲区成功，`send()` 才会返回你“写成功了”；**
- 如果这个缓冲区满了，`send()` 就会返回 `-1`，并设置 `errno = EAGAIN`。

这就是“写缓冲区满”的真正含义 —— 是**你本地操作系统的内核缓冲区满了**，跟浏览器还没关系。

## 完结撒花