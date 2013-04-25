/* 
 * Copyright (C) 2012 Binux <17175297.hk@gmail.com>
 *
 * This file is part of YAAW (https://github.com/binux/yaaw).
 *
 * YAAW is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * YAAW is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You may get a copy of the GNU Lesser General Public License
 * from http://www.gnu.org/licenses/lgpl.txt
 *
 */

var YAAW = (function() {
  var selected_tasks = false;
  var on_gid = null;
  var torrent_file = null, file_type = null;
  return {
    init: function() {
      this.tpl.init();
      this.setting.init();
      this.contextmenu.init();
      this.event_init();
      this.aria2_init();
    },

    aria2_init: function() {
      ARIA2.init(this.setting.jsonrpc_path, function() {
        if (YAAW.setting.add_task_option) {
          $("#add-task-option-wrap").empty().append(YAAW.tpl.add_task_option(YAAW.setting.add_task_option));
        } else {
          ARIA2.init_add_task_option();
        }
        ARIA2.refresh();
        ARIA2.auto_refresh(YAAW.setting.refresh_interval);
        ARIA2.get_version();
        ARIA2.global_stat();
      });
    },

    event_init: function() {
      $("[rel=tooltip]").tooltip({"placement": "bottom"});

      $(".task .select-box").live("click", function() {
        YAAW.tasks.toggle($(this).parents(".task"));
        YAAW.tasks.check_select();
      });

      $(".task .task-name > span").live("click", function() {
        var task = $(this).parents(".task");
        if (task.hasClass("info-open")) {
          YAAW.tasks.info_close();
        } else {
          YAAW.tasks.info_close();
          YAAW.tasks.info(task);
        }
      });

      $("#uri-more").click(function() {
        $("#add-task-uri .input-append").toggle();
        $("#uri-textarea").toggle();
        $("#uri-more .or-and").toggle();
        $("#uri-input").val("");
        $("#uri-textarea").val("");
        $("#ati-out").parents(".control-group").val("").toggle();
      });

      $("#ib-files li").live("click", function() {
        $(this).find(".select-box").toggleClass("icon-ok");
      });

      $("#ib-file-save").live("click", function() {
        var indexes = [];
        $("#ib-files .select-box.icon-ok").each(function(i, n) {
          indexes.push(n.getAttribute("data-index"));
        });
        if (indexes.length == 0) {
          ARIA2.main_alert("alert-error", "应选择至少一个文件.或者只是停止任务.", 5000);
        } else {
          var options = {
            "select-file": indexes.join(","),
          };
          ARIA2.change_option($(this).parents(".info-box").attr("data-gid"), options);
        };
      });

      $("#ib-file-select").live("click", function() {
        $("#ib-files .select-box").addClass("icon-ok");
      });

      $("#ib-file-unselect").live("click", function() {
        $("#ib-files .select-box").removeClass("icon-ok");
      });

      $("#ib-options-a").live("click", function() {
        ARIA2.get_options($(".info-box").attr("data-gid"));
      });

      var active_task_allowed_options = ["max-download-limit", "max-upload-limit"];
      $("#ib-options-save").live("click", function() {
        var options = {};
        var gid = $(this).parents(".info-box").attr("data-gid")
        var status = $("#task-gid-"+gid).attr("data-status");
        $.each($("#ib-options-form input"), function(n, e) {
          if (status == "active" && active_task_allowed_options.indexOf(e.name) == -1)
            return;
          options[e.name] = e.value;
        });
        ARIA2.change_options($(".info-box").attr("data-gid"), options);
      });

      $("#select-all-btn").click(function() {
        if (selected_tasks) {
          YAAW.tasks.unSelectAll();
        } else {
          YAAW.tasks.selectAll();
        }
      });

      $("#refresh-btn").click(function() {
        YAAW.tasks.unSelectAll();
        YAAW.tasks.info_close();
        $("#main-alert").hide();
        ARIA2.refresh();
        return false;
      });

      $("#setting-modal").on("show", function() {
        ARIA2.get_global_option();
      });

      if (window.FileReader) {
        var holder = $("#add-task-modal .modal-body").get(0);
        holder.ondragover = function() {
          $(this).addClass("hover");
          return false;
        }
        holder.ondragend = function() {
          $(this).removeClass("hover");
          return false;
        }
        holder.ondrop = function(e) {
          $(this).removeClass("hover");
          e.preventDefault();
          var file = e.dataTransfer.files[0];
          YAAW.add_task.upload(file);
          return false;
        }

        var tup = $("#torrent-up-input").get(0);
        tup.onchange = function(e) {
          var file = e.target.files[0];
          YAAW.add_task.upload(file);
        }
      } else {
        $("#torrent-up-input").remove();
        $("#torrent-up-btn").addClass("disabled").tooltip({title: "文件API不支持."});
      }

      if (window.applicationCache) {
        var appcache = window.applicationCache;
        $(document).ready(function() {
          if (appcache.status == appcache.IDLE)
            $("#offline-cached").text("cached");
        });
        appcache.addEventListener("cached", function(){
          $("#offline-cached").text("cached");
        });
      }
    },

    tpl: {
      init: function() {
        var _this = this;
        $("script[type='text/mustache-template']").each(function(i, n) {
          var key = n.getAttribute("id").replace(/-tpl$/, "").replace(/-/g, "_");
          _this[key] = function() {
            var tpl = Mustache.compile($(n).text());
            return function(view) {
              view._v = _this.view;
              return tpl(view);
            };
          }();
        });
      },

      view: {
        bitfield: function() {
          return function(text) {
            var len = text.length;
            var result = "";
            var graphic = "░▒▓█";
            for (var i=0; i<len; i++)
              result += graphic[Math.floor(parseInt(text[i], 16)/4)] + "&#8203;";
            return result;
          };
        },

        format_size: function() {
          var format_text = ["B", "KB", "MB", "GB", "TB", ];
          return function format_size(size) {
            if (size === '') return '';
            size = parseInt(size);
            var i = 0;
            while (size >= 1024) {
              size /= 1024;
              i++;
            }
            if (size==0) {
              return "0 KB";
            } else {
              return size.toFixed(2)+" "+format_text[i];
            }
          };
        },

        format_size_0: function() {
          var format_text = ["B", "KB", "MB", "GB", "TB", ];
          return function format_size(size) {
            if (size === '') return '';
            size = parseInt(size);
            var i = 0;
            while (size >= 1024) {
              size /= 1024;
              i++;
            }
            if (size==0) {
              return "0 KB";
            } else {
              return size.toFixed(0)+" "+format_text[i];
            }
          };
        },

        format_time: function() {
          var time_interval = [60, 60, 24];
          var time_text = ["s", "m", "h"];
          return function format_time(time) {
            if (time == Infinity) {
              return "INF";
            } else if (time == 0) {
              return "0s";
            }

            time = Math.floor(time);
            var i = 0;
            var result = "";
            while (time > 0 && i < 3) {
              result = time % time_interval[i] + time_text[i] + result;
              time = Math.floor(time/time_interval[i]);
              i++;
            }
            if (time > 0) {
              result = time + "d" + result;
            }
            return result;
          };
        },

        error_msg: function() {
          var error_code_map = {
            0: "",
            1: "发生未知错误.",
            2: "发生超时.",
            3: "未找到资源.",
            4: "资源没有被发现. 检查 --max-file-not-found 选项.",
            5: "未找到资源. 检查 --lowest-speed-limit 选项.",
            6: "出现网络问题.",
            7: "未完成的下载.",
            8: "远程服务器不支持恢复简历时需要完成下载.",
            9: "有没有足够的可用磁盘空间.",
            10: "文件长度不同 .aria2控制文件. 检查 --allow-piece-length-change 选项.",
            11: "aria2 was downloading same file at that moment.",
            12: "aria2 was downloading same info hash torrent at that moment.",
            13: "文件已经存在. 检查 --allow-overwrite 选项.",
            14: "重命名文件失败. 检查 --auto-file-renaming 选项.",
            15: "aria2 could not open existing file.",
            16: "aria2 could not create new file or truncate existing file.",
            17: "I/O发生错误.",
            18: "aria2 无法创建目录.",
            19: "名称解析失败.",
            20: "无法解析的Metalink文件.",
            21: "FTP 命令失败.",
            22: "HTTP 响应头是坏的.",
            23: "发生的重定向太多.",
            24: "HTTP 授权失败.",
            25: "aria2不能解析文件(.torrent file).",
            26: ".torrent 文件被损坏或丢失的信息.",
            27: "Magnet URI was bad.",
            28: "bad/unrecognized option was given or unexpected option argument was given.",
            29: "远程服务器无法处理请求，因暂时超载或维护.",
            30: "aria2无法解析JSON-RPC请求.",
          };
          return function(text) {
            return error_code_map[text] || "";
          };
        },

        status_icon: function() {
          var status_icon_map = {
            active: "icon-download-alt",
            waiting: "icon-time",
            paused: "icon-pause",
            error: "icon-remove",
            complete: "icon-ok",
            removed: "icon-trash",
          };
          return function(text) {
            return status_icon_map[text] || "";
          };
        },
      },
    },

    add_task: {
      submit: function(_this) {
        var uri = $("#uri-input").val() || $("#uri-textarea").val() && $("#uri-textarea").val().split("\n") ;
        var options = {}, options_save = {};
        $("#add-task-option input[name], #add-task-option textarea[name]").each(function(i, n) {
          var name = n.getAttribute("name");
          var value = (n.type == "checkbox" ? n.checked : n.value);
          if (name && value) {
            options[name] = String(value);
            if ($(n).hasClass("input-save")) {
              options_save[name] = String(value);
            }
          }
        });

        if (uri) {
          ARIA2.madd_task(uri, options);
          YAAW.setting.save_add_task_option(options_save);
        } else if (torrent_file) {
          if (file_type.indexOf("metalink") != -1) {
            ARIA2.add_metalink(torrent_file, options);
          } else {
            ARIA2.add_torrent(torrent_file, options);
          }
          YAAW.setting.save_add_task_option(options_save);
        }
      },
      
      clean: function() {
        $("#uri-input").attr("placeholder", "HTTP, FTP or Magnet");
        $("#add-task-modal .input-clear").val("");
        $("#add-task-alert").hide();
        torrent_file = null;
        file_type = null;
      },

      upload: function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          $("#uri-input").attr("placeholder", file.name);
          torrent_file = e.target.result.replace(/.*?base64,/, "");
          file_type = file.type;
        };
        reader.onerror = function(e) {
          $("#torrent-up-input").remove();
          $("#torrent-up-btn").addClass("disabled");
        };
        reader.readAsDataURL(file);
      },
    },

    tasks: {
      check_select: function() {
        var selected = $(".tasks-table .task.selected");
        if (selected.length == 0) {
          selected_tasks = false;
          $("#select-btn .select-box").removeClass("icon-minus icon-ok");
        } else if (selected.length < $(".tasks-table .task").length) {
          selected_tasks = true;
          $("#select-btn .select-box").removeClass("icon-ok").addClass("icon-minus");
        } else {
          selected_tasks = true;
          $("#select-btn .select-box").removeClass("icon-minus").addClass("icon-ok");
        }

        if (selected.length + $(".info-box").length == 0) {
          ARIA2.select_lock(false);
        } else {
          ARIA2.select_lock(true);
        }

        if (selected_tasks) {
          $("#not-selected-grp").hide();
          $("#selected-grp").show();
        } else {
          $("#not-selected-grp").show();
          $("#selected-grp").hide();
        }
      },

      select: function(task) {
        $(task).addClass("selected").find(".select-box").addClass("icon-ok");
      },

      unSelect: function(task) {
        $(task).removeClass("selected").find(".select-box").removeClass("icon-ok");
      },

      toggle: function(task) {
        $(task).toggleClass("selected").find(".select-box").toggleClass("icon-ok");
      },
      
      unSelectAll: function(notupdate) {
        var _this = this;
        $(".tasks-table .task.selected").each(function(i, n) {
          _this.unSelect(n);
        });
        if (!notupdate)
          this.check_select();
      },

      selectAll: function() {
        var _this = this;
        $(".tasks-table .task").each(function(i, n) {
          _this.select(n);
        });
        this.check_select();
      },

      selectActive: function() {
        var _this = this;
        this.unSelectAll(true);
        $(".tasks-table .task[data-status=active]").each(function(i, n) {
          _this.select(n);
        });
        this.check_select();
      },

      selectWaiting: function() {
        var _this = this;
        this.unSelectAll(true);
        $(".tasks-table .task[data-status=waiting]").each(function(i, n) {
          _this.select(n);
        });
        this.check_select();
      },

      selectPaused: function() {
        var _this = this;
        this.unSelectAll(true);
        $(".tasks-table .task[data-status=paused]").each(function(i, n) {
          _this.select(n);
        });
        this.check_select();
      },

      selectStoped: function() {
        var _this = this;
        this.unSelectAll(true);
        $("#stoped-tasks-table .task").each(function(i, n) {
          _this.select(n);
        });
        this.check_select();
      },

      getSelectedGids: function() {
        var gids = new Array();
        $(".tasks-table .task.selected").each(function(i, n) {
          gids.push(n.getAttribute("data-gid"));
        });
        return gids;
      },

      pause: function() {
        var gids = new Array();
        $(".tasks-table .task.selected").each(function(i, n) {
          if (n.getAttribute("data-status") == "active" ||
            n.getAttribute("data-status") == "waiting")
            gids.push(n.getAttribute("data-gid"));
        });
        if (gids.length) ARIA2.pause(this.getSelectedGids());
      },

      unpause: function() {
        var gids = new Array();
        var stoped_gids = new Array();
        $(".tasks-table .task.selected").each(function(i, n) {
          var status = n.getAttribute("data-status");
          if (status == "paused") {
            gids.push(n.getAttribute("data-gid"));
          } else if ("removed/error".indexOf(status) != -1) {
            stoped_gids.push(n.getAttribute("data-gid"));
          }
        });
        if (gids.length) ARIA2.unpause(gids);
        if (stoped_gids.length) ARIA2.restart_task(stoped_gids);
      },

      remove: function() {
        var gids = new Array();
        var remove_list = ["active", "waiting", "paused"];
        var remove_gids = new Array();
        $(".tasks-table .task.selected").each(function(i, n) {
          if (remove_list.indexOf(n.getAttribute("data-status")) != -1)
            remove_gids.push(n.getAttribute("data-gid"));
          else
            gids.push(n.getAttribute("data-gid"));
        });
        if (remove_gids.length) ARIA2.remove(remove_gids);
        if (gids.length) ARIA2.remove_result(gids);
      },

      info: function(task) {
        task.addClass("info-open");
        task.after(YAAW.tpl.info_box({gid: task.attr("data-gid")}));
        if (task.parents("#stoped-tasks-table").length) {
          $("#ib-options-a").hide();
        }
        ARIA2.get_status(task.attr("data-gid"));
        ARIA2.select_lock(true);
      },

      info_close: function(task) {
        $(".info-box").remove();
        $(".info-open").removeClass("info-open");

        if ($(".tasks-table .task.selected").length == 0) {
          ARIA2.select_lock(false);
        } else {
          ARIA2.select_lock(true);
        }
      },
    },

    contextmenu: {
      init: function() {
        $(".task").live("contextmenu", function(ev) {
          $("#task-contextmenu").css("top", ev.clientY).css("left", ev.clientX).show();
          on_gid = ""+this.getAttribute("data-gid");

          var status = this.getAttribute("data-status");
          if (status == "waiting" || status == "paused")
            $("#task-contextmenu .task-move").show();
          else
            $("#task-contextmenu .task-move").hide();
          if (status == "removed" || status == "completed" || status == "error") {
            $(".task-restart").show();
            $(".task-start").hide();
          } else {
            $(".task-restart").hide();
            $(".task-start").show();
          }
          return false;
        }).live("mouseout", function(ev) {
          // toElement is not available in Firefox, use relatedTarget instead.
          var enteredElement = ev.toElement || ev.relatedTarget;
          if ($.contains(this, enteredElement) ||
            $("#task-contextmenu").get(0) == enteredElement ||
            $.contains($("#task-contextmenu").get(0), enteredElement)) {
            return;
          }
          on_gid = null;
          $("#task-contextmenu").hide();
        });

        $("#task-contextmenu a").click(function() {
          $("#task-contextmenu").hide();
        });
        var mouse_on = false;
        $("#task-contextmenu").hover(function() {
          mouse_on = true;
        }, function() {
          if (mouse_on) {
            on_gid = null;
            $("#task-contextmenu").hide();
          }
        });

      },

      restart: function() {
        if (on_gid) ARIA2.restart_task([on_gid, ]);
        on_gid = null;
      },

      pause: function() {
        if (on_gid) ARIA2.pause(on_gid);
        on_gid = null;
      },

      unpause: function() {
        if (on_gid) ARIA2.unpause(on_gid);
        on_gid = null;
      },

      remove: function() {
        if (on_gid) ARIA2.remove(on_gid);
        on_gid = null;
      },

      movetop: function() {
        if (on_gid) ARIA2.change_pos(on_gid, 0, 'POS_SET');
        on_gid = null;
      },

      moveup: function() {
        if (on_gid) ARIA2.change_pos(on_gid, -1, 'POS_CUR');
        on_gid = null;
      },

      movedown: function() {
        if (on_gid) ARIA2.change_pos(on_gid, 1, 'POS_CUR');
        on_gid = null;
      },

      moveend: function() {
        if (on_gid) ARIA2.change_pos(on_gid, 0, 'POS_END');
        on_gid = null;
      },

    },

    setting: {
      init: function() {
        this.jsonrpc_path = $.Storage.get("jsonrpc_path") || "http://"+(location.host.split(":")[0]||"localhost")+":6800"+"/jsonrpc";
        this.refresh_interval = Number($.Storage.get("refresh_interval") || 10000);
        this.add_task_option = $.Storage.get("add_task_option");
        this.jsonrpc_history = JSON.parse($.Storage.get("jsonrpc_history") || "[]");
        if (this.add_task_option) {
          this.add_task_option = JSON.parse(this.add_task_option);
        }
        // overwrite settings with hash
        if (location.hash && location.hash.length) {
          var args = location.hash.substring(1).split('&'), kwargs = {};
          $.each(args, function(i, n) {
            n = n.split('=', 2);
            kwargs[n[0]] = n[1];
          });

          if (kwargs['path']) this.jsonrpc_path = kwargs['path'];
          this.kwargs = kwargs;
        }

        var _this = this;
        $('#setting-modal').on('hidden', function () {
          _this.update();
        });

        this.update();
      },

      save_add_task_option: function(options) {
        this.add_task_option = options;
        $.Storage.set("add_task_option", JSON.stringify(options));
      },

      save: function() {
        $.Storage.set("jsonrpc_path", this.jsonrpc_path);
        if (this.jsonrpc_history.indexOf(this.jsonrpc_path) == -1) {
          if (this.jsonrpc_history.push(this.jsonrpc_path) > 10) {
            this.jsonrpc_history.shift();
          }
          $.Storage.set("jsonrpc_history", JSON.stringify(this.jsonrpc_history));
        }
        $.Storage.set("refresh_interval", String(this.refresh_interval));
      },

      update: function() {
        $("#setting-form #rpc-path").val(this.jsonrpc_path);
        $("#setting-form input:radio[name=refresh_interval][value="+this.refresh_interval+"]").attr("checked", true);
        if (this.jsonrpc_history.length) {
          var content = '<ul class="dropdown-menu">';
          $.each(this.jsonrpc_history, function(n, e) {
            content += '<li><a href="#">'+e+'</a></li>';
          });
          content += '</ul>';
          $(".rpc-path-wrap").append(content).on("click", "li>a", function() {
            $("#setting-form #rpc-path").val($(this).text());
          });
          $(".rpc-path-wrap .dropdown-toggle").removeAttr("disabled").dropdown();
        }
      },

      submit: function() {
        _this = $("#setting-form");
        var _jsonrpc_path = _this.find("#rpc-path").val();
        var _refresh_interval = Number(_this.find("input:radio[name=refresh_interval]:checked").val());

        var changed = false;
        if (_jsonrpc_path != undefined && this.jsonrpc_path != _jsonrpc_path) {
          this.jsonrpc_path = _jsonrpc_path;
          YAAW.tasks.unSelectAll();
          $("#main-alert").hide();
          YAAW.aria2_init();
          changed = true;
        }
        if (_refresh_interval != undefined && this.refresh_interval != _refresh_interval) {
          this.refresh_interval = _refresh_interval;
          ARIA2.auto_refresh(this.refresh_interval);
          changed = true;
        }
        if (changed) {
          this.save();
        }

        // submit aria2 global setting
        var options = {};
        $("#aria2-gs-form input[name]").each(function(i, n) {
          var name = n.getAttribute("name");
          var value = n.value;
          if (name && value)
            options[name] = value;
        });
        ARIA2.change_global_option(options);
        $("#setting-modal").modal('hide');
      },
    },
  }
})();
YAAW.init();
