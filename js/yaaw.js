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

            ARIA2.init(this.setting.jsonrpc_path);
            if (YAAW.setting.add_task_option) {
                $("#add-task-option-wrap").empty().append(YAAW.tpl.add_task_option(YAAW.setting.add_task_option));
            } else {
                ARIA2.init_add_task_option();
            }
            ARIA2.refresh();
            ARIA2.auto_refresh(this.setting.refresh_interval);
            ARIA2.get_version();
        },

        event_init: function() {
            $("[rel=tooltip]").tooltip({"placement": "bottom"});

            $(".task").live("click", function() {
                YAAW.tasks.toggle(this);
                YAAW.tasks.check_select();
            })

            $("#refresh-btn").click(function() {
                YAAW.tasks.unSelectAll();
                $("#main-alert").hide();
                ARIA2.refresh();
                return false;
            });

            $("#select-all-btn").click(function() {
                if (selected_tasks) {
                    YAAW.tasks.unSelectAll();
                } else {
                    YAAW.tasks.selectAll();
                }
            });

            $("#setting-modal").on("show", function() {
                ARIA2.get_global_option();
            });

            if (window.FileReader && location.host) {
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

                    var file = e.dataTransfer.files[0];
                    YAAW.add_task.upload(file);
                }

                var tup = $("#torrent-up-input").get(0);
                tup.onchange = function(e) {
                    var file = e.target.files[0];
                    YAAW.add_task.upload(file);
                }
            } else {
                $("#torrent-up-input").remove();
                $("#torrent-up-btn").attr("disabled", true);
            }
        },

        tpl: {
            init: function() {
                this.global_speed = Mustache.compile($("#global-speed-tpl").text());
                this.active_task = Mustache.compile($("#active-task-tpl").text());
                this.other_task = Mustache.compile($("#other-task-tpl").text());
                this.other_task_empty = Mustache.compile($("#other-task-empty").text());
                this.aria2_global_setting = Mustache.compile($("#aria2-global-setting-tpl").text());
                this.add_task_option = Mustache.compile($("#add-task-option-tpl").text());
            },
        },

        add_task: {
            submit: function(_this) {
                var uri = $("#uri-input").val();
                var options = {};
                $("#add-task-option input[name]").each(function(i, n) {
                    var name = n.getAttribute("name");
                    var value = (n.type == "checkbox" ? n.checked : n.value);
                    if (name && value)
                        options[name] = String(value);
                });
                YAAW.setting.save_add_task_option(options);
                if (uri) {
                    ARIA2.add_task(uri, options);
                } else if (torrent_file) {
                    if (file_type.indexOf("metalink") != -1) {
                        ARIA2.add_metalink(torrent_file, options);
                    } else {
                        ARIA2.add_torrent(torrent_file, options);
                    }
                }
            },
            
            clean: function() {
                $("#uri-input").attr("placeholder", "HTTP, FTP or Magnet");
                $("#add-task-modal input.input-clear").val("");
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
                }
                reader.readAsDataURL(file);
            },
        },

        tasks: {
            check_select: function() {
                var selected = $(".tasks-table .task.selected");
                if (selected.length == 0) {
                  ARIA2.select_lock(false);
                  selected_tasks = false;
                  $("#select-btn .select-box").removeClass("icon-minus icon-ok");
                } else if (selected.length < $(".tasks-table tr.task").length) {
                  ARIA2.select_lock(true);
                  selected_tasks = true;
                  $("#select-btn .select-box").removeClass("icon-ok").addClass("icon-minus");
                } else {
                  ARIA2.select_lock(true);
                  selected_tasks = true;
                  $("#select-btn .select-box").removeClass("icon-minus").addClass("icon-ok");
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
                $(".tasks-table .task.selected").each(function(i, n) {
                    if (n.getAttribute("data-status") == "paused") {
                        gids.push(n.getAttribute("data-gid"));
                    }
                });
                if (gids.length) ARIA2.unpause(gids);
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
        },

        contextmenu: {
            init: function() {
                $(".task").live("contextmenu", function(ev) {
                    $("#task-contextmenu").css("top", ev.clientY).css("left", ev.clientX).show();
                    on_gid = ""+this.getAttribute("data-gid");
                    return false;
                }).live("mouseout", function(ev) {
                    if ($.contains(this, ev.toElement) ||
                        $("#task-contextmenu").get(0) == ev.toElement ||
                        $.contains($("#task-contextmenu").get(0), ev.toElement)) {
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

        },

        setting: {
            init: function() {
                this.jsonrpc_path = $.Storage.get("jsonrpc_path") || "http://"+(location.host.split(":")[0]||"localhost")+":6800"+"/jsonrpc";
                this.refresh_interval = Number($.Storage.get("refresh_interval") || 10000);
                this.add_task_option = $.Storage.get("add_task_option");
                if (this.add_task_option) {
                    this.add_task_option = JSON.parse(this.add_task_option);
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
                $.Storage.set("refresh_interval", String(this.refresh_interval));
            },

            update: function() {
                $("#setting-form #rpc-path").val(this.jsonrpc_path);
                $("#setting-form input:radio[name=refresh_interval][value="+this.refresh_interval+"]").attr("checked", true);
            },

            submit: function() {
                _this = $("#setting-form");
                var _jsonrpc_path = _this.find("#rpc-path").val();
                var _refresh_interval = Number(_this.find("input:radio[name=refresh_interval]:checked").val());

                var changed = false;
                if (_jsonrpc_path != undefined && this.jsonrpc_path != _jsonrpc_path) {
                    this.jsonrpc_path = _jsonrpc_path;
                    ARIA2.init(this.jsonrpc_path);
                    ARIA2.get_version();
                    YAAW.refresh_btn();
                    changed = true;
                }
                if (_refresh_interval != undefined && this.refresh_interval != _refresh_interval) {
                    this.refresh_interval = _refresh_interval;
                    ARIA2.auto_refresh(this.refresh_interval);
                    changed = true;
                }

                if (changed) this.save();


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
