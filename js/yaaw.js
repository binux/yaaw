var YAAW = (function() {
    var selected_tasks = false;
    var on_gid = null;
    return {
        init: function() {
            YAAW.contextmenu.init();
            YAAW.setting.init();

            $("[rel=tooltip]").tooltip({"placement": "bottom"});

            $(".task").live("click", function() {
                YAAW.tasks.toggle(this);
                YAAW.tasks.check_select();
            })

            $("#refresh-btn").click(YAAW.refresh_btn);
            $("#select-all-btn").click(function() {
                if (selected_tasks) {
                    YAAW.tasks.unSelectAll();
                } else {
                    YAAW.tasks.selectAll();
                }
            });

            ARIA2.init(YAAW.setting.jsonrpc_path);
            ARIA2.refresh();
            ARIA2.auto_refresh(YAAW.setting.refresh_interval);
        },

        add_task_uri_submit: function(_this) {
            ARIA2.add_task(_this.uri.value);
            $("#add-task-submit").button("Adding...");
        },

        refresh_btn: function() {
            YAAW.tasks.unSelectAll();
            $("#main-alert").hide();
            ARIA2.refresh();
            return false;
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
                $(".tasks-table .task.selected").each(function(i, n) {
                    YAAW.tasks.unSelect(n);
                });
                if (!notupdate)
                    YAAW.tasks.check_select();
            },

            selectAll: function() {
                $(".tasks-table .task").each(function(i, n) {
                    YAAW.tasks.select(n);
                });
                YAAW.tasks.check_select();
            },

            selectActive: function() {
                YAAW.tasks.unSelectAll(true);
                $(".tasks-table .task[data-status=active]").each(function(i, n) {
                    YAAW.tasks.select(n);
                });
                YAAW.tasks.check_select();
            },

            selectWaiting: function() {
                YAAW.tasks.unSelectAll(true);
                $(".tasks-table .task[data-status=waiting]").each(function(i, n) {
                    YAAW.tasks.select(n);
                });
                YAAW.tasks.check_select();
            },

            selectPaused: function() {
                YAAW.tasks.unSelectAll(true);
                $(".tasks-table .task[data-status=paused]").each(function(i, n) {
                    YAAW.tasks.select(n);
                });
                YAAW.tasks.check_select();
            },

            selectStoped: function() {
                YAAW.tasks.unSelectAll(true);
                $("#stoped-tasks-table .task").each(function(i, n) {
                    YAAW.tasks.select(n);
                });
                YAAW.tasks.check_select();
            },

            getSelectedGids: function() {
                var gids = new Array();
                $(".tasks-table .task.selected").each(function(i, n) {
                    gids.push(n.getAttribute("data-gid"));
                });
                return gids;
            },

            pause: function() {
                ARIA2.pause(YAAW.tasks.getSelectedGids());
            },

            unpause: function() {
                ARIA2.unpause(YAAW.tasks.getSelectedGids());
            },

            remove: function() {
                ARIA2.remove(YAAW.tasks.getSelectedGids());
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
                this.refresh_interval = $.Storage.get("refresh_interval") || 10000;

                this.update();
                console.log(this);
            },

            update: function() {
                $("#setting-form #rpc-path").val(this.jsonrpc_path);
                $("#setting-form input:radio[name=refresh_interval][value="+this.refresh_interval+"]").attr("checked", true);
            },

            submit: function() {
                this.jsonrpc_path = $("#setting-form #rpc-path").val();
                this.refresh_interval = $("#setting-form input:radio[name=refresh_interval]:checked").val();
            },

            save: function() {
                $.Storage.set("jsonrpc_path", this.jsonrpc_path);
                $.Storage.set("refresh_interval", this.refresh_interval);
            },
        },
    }
})();
YAAW.init();
