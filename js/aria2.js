if (typeof ARIA2=="undefined"||!ARIA2) var ARIA2=(function(){
    var jsonrpc_interface, interval_id;
    var active_tasks_snapshot="", select_lock=false, need_refresh=false;
    var auto_refresh=false;

    function get_error(result) {
        if (typeof result == "string")
            return result;
        else if (typeof result.error == "string")
            return result.error;
        else if (result.error && result.error.message)
            return result.error.message;
    }
    var status_icon_map = {
        active: "icon-download-alt",
        waiting: "icon-time",
        paused: "icon-pause",
        error: "icon-warning-sign",
        complete: "icon-inbox",
        removed: "icon-remove",
    };

    function default_error(result) {
        //console.debug(result);

        var error_msg = get_error(result);

        $("#main-alert .alert").attr("class", "alert alert-error");
        $("#main-alert .alert-msg").html("<strong>Error: </strong>"+error_msg);
        $("#main-alert").show();
    }

    function main_alert(_class, msg, timeout) {
        $("#main-alert .alert").attr("class", "alert "+_class);
        $("#main-alert .alert-msg").html(msg);
        $("#main-alert").show();
        if (timeout)
            window.setTimeout(function() { $("#main-alert").fadeOut(); }, timeout);
    }

    function bind_event(dom) {
        dom.find("[rel=tooltip]").tooltip({"placement": "bottom"});
    }

    return {
        init: function() {
            var args = arguments;
            jsonrpc_interface = args[0] || "http://"+(location.host.split(":")[0]||"localhost")+":6800"+"/jsonrpc";
            $.jsonRPC.setup({endPoint: jsonrpc_interface, namespace: 'aria2'});
        },

        request: function(method, params, success, error) {
            if (error == undefined)
                error = default_error;
            $.jsonRPC.request(method, {params:params, success:success, error:error});
        },

        batch_request: function(method, params, success, error) {
            if (error == undefined)
                error = default_error;
            var commands = new Array();
            $.each(params, function(i, n) {
                if (!$.isArray(n)) n = [n];
                commands.push({method: method, params: n});
            });
            $.jsonRPC.batchRequest(commands, {success:success, error:error});
        },

        add_task: function() {
            var args = arguments;
            uri = args[0];
            if (!uri) return false;
            ARIA2.request("addUri", [[uri]],
                function(result) {
                    //console.debug(result);
                    //id:1
                    //jsonrpc:"2.0"
                    //result:"2"
                    ARIA2.refresh();
                    $("#add-task-modal").modal('hide');
                    $("#add-task-modal uri-input").val("");
                    $("#add-task-alert").hide();
                }, 
                function(result) {
                    //console.debug(result);

                    var error_msg = get_error(result);

                    $("#add-task-alert .alert-msg").text(error_msg);
                    $("#add-task-alert").show();
                    console.warn("add task error: "+error_msg);
                });
        },

        tell_active: function(keys) {
            ARIA2.request("tellActive", keys,
                function(result) {
                    //console.debug(result);

                    if (select_lock) return;
                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    var snapshot = new Array();
                    $.each(result.result, function(i, e) {
                        snapshot.push(e.gid);
                    });
                    if (snapshot.sort().join(",") != active_tasks_snapshot) {
                        active_tasks_snapshot = snapshot.sort().join(",");
                        need_refresh = true;
                        if (auto_refresh && !select_lock)
                            ARIA2.refresh();
                    }
                
                    result = ARIA2.status_fix(result.result);
                    $("#active-tasks-table").empty().append($("#active-task-tpl").mustache({"tasks": result}));
                    bind_event($("#active-tasks-table"))
                }
            );
        },

        check_active_list: function() {
            ARIA2.request("tellActive", [["gid"]],
                function(result) {
                    //console.debug(result);

                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    var snapshot = new Array();
                    $.each(result.result, function(i, e) {
                        snapshot.push(e.gid);
                    });
                    if (snapshot.sort().join(",") != active_tasks_snapshot) {
                        active_tasks_snapshot = snapshot.sort().join(",");
                        need_refresh = true;
                        if (auto_refresh && !select_lock)
                            ARIA2.refresh();
                    }
                }
            );
        },

        tell_waiting: function(keys) {
            var params = [0, 1000];
            if (keys) params.push(keys);
            ARIA2.request("tellWaiting", params,
                function(result) {
                    //console.debug(result);

                    if (select_lock) return;
                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    result = ARIA2.status_fix(result.result);
                    $("#waiting-tasks-table").empty().append($("#other-task-tpl").mustache({"tasks": result}));
                    bind_event($("#waiting-tasks-table"))

                    if ($("#other-tasks .task").length == 0)
                        $("#waiting-tasks-table").append($("#other-task-empty").text())
                }
            );
        },

        tell_stoped: function(keys) {
            var params = [0, 1000];
            if (keys) params.push(keys);
            ARIA2.request("tellStopped", params,
                function(result) {
                    //console.debug(result);

                    if (select_lock) return;
                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    result = ARIA2.status_fix(result.result);
                    $("#stoped-tasks-table").empty().append($("#other-task-tpl").mustache({"tasks": result}));
                    bind_event($("#stoped-tasks-table"))

                    if ($("#waiting-tasks-table .empty-tasks").length > 0 &&
                        $("#stoped-tasks-table .task").length > 0) {
                            $("#waiting-tasks-table").empty();
                        }

                }
            );
        },

        status_fix: function(results) {
            function get_title(result) {
                if (result.files.length == 0) {
                    return "Unknown";
                } else {
                    var dir = result.dir;
                    var title = result.files[0].path;

                    title = title.replace(new RegExp("^"+dir+"/?"), "").split("/");
                    title = title[0]
                    if (title.length == 0)
                        title = "Unknown";

                    if (result.files.length > 1)
                        title += " ("+result.files.length+ " files..)"
                    return title;
                }
            }
            var format_text = ["B", "KB", "MB", "GB", "TB", ];
            function format_size(size) {
                size = parseInt(size);
                var i = 0;
                while (size > 1024) {
                    size /= 1024;
                    i++;
                }
                if (size==0) {
                    return size;
                } else {
                    return size.toFixed(2)+" "+format_text[i];
                }
            }
            var time_interval = [60, 60, 24];
            var time_text = ["s", "m", "h"];
            function format_time(time) {
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
            }
            for (var i=0; i<results.length; i++) {
                var result = results[i];

                result.status_icon = status_icon_map[result.status];
                result.title = get_title(result);
                if (result.totalLength == 0)
                    result.progress = 0;
                else
                    result.progress = (result.completedLength * 1.0 / result.totalLength * 100).toFixed(2);
                result.etc = format_time((result.totalLength - result.completedLength)/result.downloadSpeed)

                result.completedLength = format_size(result.completedLength);
                result.uploadLength = format_size(result.uploadLength);
                result.totalLength = format_size(result.totalLength);
                result.uploadSpeed = format_size(result.uploadSpeed);
                result.downloadSpeed = format_size(result.downloadSpeed);


                result.numSeeders = parseInt(result.numSeeders);
                result.connections = parseInt(result.connections);
            }
            return results;
        },

        pause: function(gids) {
            if (!$.isArray(gids)) gids = [gids];
            ARIA2.batch_request("pause", gids,
                function(result) {
                    //console.debug(result);

                    var error = new Array();
                    $.each(result, function(i, n) {
                        var error_msg = get_error(n);
                        if (error_msg) error.push(error_msg);
                    });

                    if (error.length == 0) {
                        main_alert("alert-info", "Paused", 1000);
                    } else {
                        main_alert("alert-error", error.join("<br />"), 3000);
                    }
                }
            );
        },

        unpause: function(gids) {
            if (!$.isArray(gids)) gids = [gids];
            ARIA2.batch_request("unpause", gids,
                function(result) {
                    //console.debug(result);

                    var error = new Array();
                    $.each(result, function(i, n) {
                        var error_msg = get_error(n);
                        if (error_msg) error.push(error_msg);
                    });

                    if (error.length == 0) {
                        main_alert("alert-info", "Started", 1000);
                    } else {
                        main_alert("alert-error", error.join("<br />"), 3000);
                    }
                }
            );
        },

        remove: function(gids) {
            if (!$.isArray(gids)) gids = [gids];
            ARIA2.batch_request("remove", gids,
                function(result) {
                    //console.debug(result);

                    var error = new Array();
                    $.each(result, function(i, n) {
                        var error_msg = get_error(n);
                        if (error_msg) error.push(error_msg);
                    });

                    if (error.length == 0) {
                        main_alert("alert-info", "Paused", 1000);
                    } else {
                        main_alert("alert-error", error.join("<br />"), 3000);
                    }
                }
            );
        },

        pause_all: function() {
            ARIA2.request("pauseAll", [],
                function(result) {
                    //console.debug(result);

                    ARIA2.refresh();
                    main_alert("alert-info", "Paused all tasks. Please wait for action such as contacting BitTorrent tracker.", 2000);
                }
            );
        },

        unpause_all: function() {
            ARIA2.request("unpauseAll", [],
                function(result) {
                    //console.debug(result);

                    ARIA2.refresh();
                    main_alert("alert-info", "Unpaused all tasks.", 2000);
                }
            );
        },

        purge_download_result: function() {
            ARIA2.request("purgeDownloadResult", [],
                function(result) {
                    //console.debug(result);

                    ARIA2.refresh();
                    main_alert("alert-info", "Removed all completed/error/removed downloads tasks.", 2000);
                }
            );
        },

        refresh: function() {
            need_refresh = false;
            ARIA2.tell_active();
            ARIA2.tell_waiting();
            ARIA2.tell_stoped();
        },

        select_lock: function (bool) {
            select_lock = bool;
        },

        auto_refresh: function(interval) {
            if (interval_id)
                window.clearInterval(interval_id);
            if (interval == undefined) {
                auto_refresh = false;
                return ;
            }
            interval_id = window.setInterval(function() {
                if (select_lock) {
                    if (need_refresh) {
                        main_alert("", "Task list have changed since last update. Click 'Refresh' button to update task list.");
                    } else {
                        ARIA2.check_active_list();
                    }
                } else {
                    if (need_refresh) {
                        ARIA2.refresh();
                    } else {
                        ARIA2.tell_active();
                    }
                }
            }, interval);
            auto_refresh = true;
        },


    }
})();
