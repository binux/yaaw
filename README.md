YAAW
====
汉化版地址：http://yaaw.ghostry.cn/

Yet Another Aria2 Web Frontend in pure HTML/CSS/Javascirpt.

No HTTP server, backend or server-side program. All you need is just a browser.

<br />

Usage
-----
1. Run aria2 with RPC enabled
> aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all -c -D
>
> Warning: This options will not verify the identity of caller. KEEP THE ADDRESS SECRET.

2. Visit **index.html**.

3. Change "JSON-RPC Path" setting if "Internal server error" occurred.

Tips
----
* All your settings on web is temporary. **Settings will be lost after aria2 restarted.**
* Tasks(including which is not finished) will be lost after aria2 restarted. Using `--save-session=SOME/WHERE` and reload with `--continue=true --input-file=SOME/WHERE` to continue.
* Using `$HOME/.aria2/aria2.conf` to save your options.
* For more infomations about aria2, visit [Aria2 Manual](http://aria2.sourceforge.net/manual/en/html/)

Components
----------
+ [Bootstrap](http://twitter.github.com/bootstrap/)
+ [mustache.js](https://github.com/janl/mustache.js)
+ [jQuery](http://jquery.com/)
+ [jQuery Storage](http://archive.plugins.jquery.com/project/html5Storage)
+ [JSON RPC 2.0 jQuery Plugin](https://github.com/datagraph/jquery-jsonrpc)

License
-------
yaaw is licensed under GNU Lesser General Public License.
You may get a copy of the GNU Lesser General Public License from http://www.gnu.org/licenses/lgpl.txt

汉化
====
ghostry（ http://blog.ghostry.cn ）部分汉化
