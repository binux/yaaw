YAAW
====

Yet Another Aria2 Web Frontend in pure HTML/CSS/Javascirpt.

没有HTTP服务器，后端或服务器端程序。所有你需要的只是一个浏览器。

<br />

用法
-----
1. 启用RPC运行aria2
> aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all
>
> 警告：此选项将不能确认来电者的身份。保持的地址秘密。

2. Visit **index.html**.

3. “JSON-RPC路径”设置更改，如果发生“内部服务器错误”。

提示
----
*您的网络设置是暂时的 **设置会丢失aria2后重新启动**

*任务（包括还没有完成）将丢失aria2后重新启动。使用`--save-session=xxx.gz`和`--continue=true --input-file=xxx.gz`继续。

*使用`$ HOME/.aria2/aria2.conf`保存选项。

*欲了解更多关于aria2的Nessus网站，请访问 [Aria2 Manual](http://aria2.sourceforge.net/manual/en/html/)

组件
----------
+ [Bootstrap](http://twitter.github.com/bootstrap/)
+ [mustache.js](https://github.com/janl/mustache.js)
+ [jQuery](http://jquery.com/)
+ [jQuery Storage](http://archive.plugins.jquery.com/project/html5Storage)
+ [JSON RPC 2.0 jQuery Plugin](https://github.com/datagraph/jquery-jsonrpc)

许可证
-------
yaaw GNU通用公共许可证下授权。
你可能会得到一个GNU通用公共许可证的副本 http://www.gnu.org/licenses/lgpl.txt
