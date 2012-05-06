if (typeof ARIA2=="undefined"||!ARIA2) var ARIA2=(function(){
    var jsonrpc_interface, interval_id;
    var active_tasks_snapshot="", tasks_cnt_snapshot="", select_lock=false, need_refresh=false;
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
        error: "icon-remove",
        complete: "icon-ok",
        removed: "icon-trash",
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

    function get_title(result) {
        var dir = result.dir;
        var title = "Unknown";
        if (result.bittorrent && result.bittorrent.info && result.bittorrent.info.name)
            title = result.bittorrent.info.name;
        else if (result.files[0].path.replace(new RegExp("^"+dir+"/?"), "").split("/")[0])
            title = result.files[0].path.replace(new RegExp("^"+dir+"/?"), "").split("/")[0]
        else if (result.files.length && result.files[0].uris.length && result.files[0].uris[0].uri)
            title = result.files[0].uris[0].uri;

        if (result.files.length > 1)
            title += " ("+result.files.length+ " files..)"
        return title;
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
    var error_code_map = {
        0: "",
        1: "unknown error occurred.",
        2: "time out occurred.",
        3: "resource was not found.",
        4: "resource was not found. See --max-file-not-found option.",
        5: "resource was not found. See --lowest-speed-limit option.",
        6: "network problem occurred.",
        7: "unfinished download.",
        8: "remote server did not support resume when resume was required to complete download.",
        9: "there was not enough disk space available.",
        10: "piece length was different from one in .aria2 control file. See --allow-piece-length-change option.",
        11: "aria2 was downloading same file at that moment.",
        12: "aria2 was downloading same info hash torrent at that moment.",
        13: "file already existed. See --allow-overwrite option.",
        14: "renaming file failed. See --auto-file-renaming option.",
        15: "aria2 could not open existing file.",
        16: "aria2 could not create new file or truncate existing file.",
        17: "I/O error occurred.",
        18: "aria2 could not create directory.",
        19: "name resolution failed.",
        20: "could not parse Metalink document.",
        21: "FTP command failed.",
        22: "HTTP response header was bad or unexpected.",
        23: "too many redirections occurred.",
        24: "HTTP authorization failed.",
        25: "aria2 could not parse bencoded file(usually .torrent file).",
        26: ".torrent file was corrupted or missing information that aria2 needed.",
        27: "Magnet URI was bad.",
        28: "bad/unrecognized option was given or unexpected option argument was given.",
        29: "the remote server was unable to handle the request due to a temporary overloading or maintenance.",
        30: "aria2 could not parse JSON-RPC request.",
    };

    return {
        init: function(path) {
            jsonrpc_interface = path || "http://"+(location.host.split(":")[0]||"localhost")+":6800"+"/jsonrpc";
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

        add_task: function(uri, options) {
            if (!uri) return false;
            if (!options) options = {};
            ARIA2.request("addUri", [[uri], options],
                function(result) {
                    //console.debug(result);
                    ARIA2.refresh();
                    $("#add-task-modal").modal('hide');
                    YAAW.add_task.clean();
                }, 
                function(result) {
                    //console.debug(result);

                    var error_msg = get_error(result);

                    $("#add-task-alert .alert-msg").text(error_msg);
                    $("#add-task-alert").show();
                    console.warn("add task error: "+error_msg);
                });
        },

        add_torrent: function(torrent, options) {
            if (!torrent) return false;
            if (!options) options = {};
            ARIA2.request("addTorrent", [torrent, [], options],
                function(result) {
                    //console.debug(result);
                    ARIA2.refresh();
                    $("#add-task-modal").modal('hide');
                    YAAW.add_task.clean();
                }, 
                function(result) {
                    //console.debug(result);

                    var error_msg = get_error(result);

                    $("#add-task-alert .alert-msg").text(error_msg);
                    $("#add-task-alert").show();
                    console.warn("add task error: "+error_msg);
                });
        },

        add_metalink: function(metalink, options) {
            if (!metalink) return false;
            if (!options) options = {};
            ARIA2.request("addMetalink", [metalink, [], options],
                function(result) {
                    //console.debug(result);
                    ARIA2.refresh();
                    $("#add-task-modal").modal('hide');
                    YAAW.add_task.clean();
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
            if (select_lock) return;
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
                    $("#active-tasks-table").empty().append(YAAW.tpl.active_task({"tasks": result}));
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
            if (select_lock) return;
            var params = [0, 1000];
            if (keys) params.push(keys);
            ARIA2.request("tellWaiting", params,
                function(result) {
                    if (select_lock) return;
                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    result = ARIA2.status_fix(result.result);
                    $("#waiting-tasks-table tbody").empty().append(YAAW.tpl.other_task({"tasks": result}));
                    bind_event($("#waiting-tasks-table"))

                    if ($("#other-tasks .task").length == 0)
                        $("#waiting-tasks-table tbody").append($("#other-task-empty").text())
                }
            );
        },

        tell_stoped: function(keys) {
            if (select_lock) return;
            var params = [0, 1000];
            if (keys) params.push(keys);
            ARIA2.request("tellStopped", params,
                function(result) {
                    //console.debug(result);

                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    if (select_lock) return;
                    result = ARIA2.status_fix(result.result);
                    $("#stoped-tasks-table tbody").empty().append(YAAW.tpl.other_task({"tasks": result.reverse()}));
                    bind_event($("#stoped-tasks-table"))

                    if ($("#waiting-tasks-table .empty-tasks").length > 0 &&
                        $("#stoped-tasks-table .task").length > 0) {
                            $("#waiting-tasks-table tbody").empty();
                        }

                }
            );
        },

        status_fix: function(results) {
            for (var i=0; i<results.length; i++) {
                var result = results[i];

                result.status_icon = status_icon_map[result.status];
                result.title = get_title(result);
                if (result.totalLength == 0)
                    result.progress = 0;
                else
                    result.progress = (result.completedLength * 1.0 / result.totalLength * 100).toFixed(2);
                result.etc = format_time((result.totalLength - result.completedLength)/result.downloadSpeed)

                result.error_msg = error_code_map[result.errorCode] || "";
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
                        ARIA2.refresh();
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
                        ARIA2.refresh();
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
                        main_alert("alert-info", "Removed", 1000);
                        ARIA2.refresh();
                    } else {
                        main_alert("alert-error", error.join("<br />"), 3000);
                    }
                }
            );
        },

        remove_result: function(gids) {
            if (!$.isArray(gids)) gids = [gids];
            ARIA2.batch_request("removeDownloadResult", gids,
                function(result) {
                    //console.debug(result);

                    var error = new Array();
                    $.each(result, function(i, n) {
                        var error_msg = get_error(n);
                        if (error_msg) error.push(error_msg);
                    });

                    if (error.length == 0) {
                        main_alert("alert-info", "Removed", 1000);
                        ARIA2.tell_stoped();
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

        get_global_option: function() {
            ARIA2.request("getGlobalOption", [],
                function(result) {
                    if (!result.result)
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);

                    result = result.result;
                    $("#aria2-gsetting").empty().append(YAAW.tpl.aria2_global_setting(result));
                }
            );
        },

        init_add_task_option: function() {
            ARIA2.request("getGlobalOption", [],
                function(result) {
                    if (!result.result)
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);

                    result = result.result;
                    result["parameterized-uri"] = (result["parameterized-uri"] == "true" ? true : false)
                    $("#add-task-option-wrap").empty().append(YAAW.tpl.add_task_option(result));
                }
            );
        },

        change_global_option: function(options) {
            ARIA2.request("changeGlobalOption", [options],
                function(result) {
                    if (!result.result)
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    else
                        main_alert("alert-success", "Saved", 2000);
                }
            );
        },

        global_stat: function() {
            ARIA2.request("getGlobalStat", [],
                function(result) {
                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    result = result.result;
                    result.downloadSpeed = format_size(result.downloadSpeed) || "0 KB";
                    result.uploadSpeed = format_size(result.uploadSpeed) || "0 KB";
                    var _tasks_cnt_snapshot = ""+result.numActive+","+result.numWaiting+","+result.numStopped;

                    if (_tasks_cnt_snapshot != tasks_cnt_snapshot) {
                        tasks_cnt_snapshot = _tasks_cnt_snapshot;
                        need_refresh = true;
                        if (auto_refresh && !select_lock)
                            ARIA2.refresh();
                    }

                    $("#global-speed").empty().append(YAAW.tpl.global_speed(result));
                }
            );
        },

        get_version: function() {
            ARIA2.request("getVersion", [],
                function(result) {
                    if (!result.result) {
                        main_alert("alert-error", "<strong>Error: </strong>rpc result error.", 5000);
                    }

                    $("#global-version").text("Aria2 "+result.result.version || "");
                }
            );
        },

        refresh: function() {
            if (!select_lock) {
                need_refresh = false;
                ARIA2.tell_active();
                ARIA2.tell_waiting();
                ARIA2.tell_stoped();
            }
        },

        select_lock: function (bool) {
            select_lock = bool;
        },

        auto_refresh: function(interval) {
            if (interval_id)
                window.clearInterval(interval_id);
            if (!(interval > 0)) {
                auto_refresh = false;
                return ;
            }
            interval_id = window.setInterval(function() {
                ARIA2.global_stat();
                if (select_lock) {
                    if (need_refresh) {
                        main_alert("", "Task list have changed since last update. Click 'Refresh' button to update task list.");
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
