if (typeof ARIA2=="undefined"||!ARIA2) var ARIA2=(function(){
    var jsonrpc_interface;

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
        complete: "icon-ok",
        removed: "icon-remove",
    }

    return {
        init: function() {
            var args = arguments;
            jsonrpc_interface = args[0] || "http://"+location.host+":6800"+"/jsonrpc";
            $.jsonRPC.setup({endPoint: jsonrpc_interface, namespace: 'aria2'});
        },

        request: function(method, params, success, error) {
            $.jsonRPC.request(method, {params:params, success:success, error:error});
        },

        add_task: function() {
            var args = arguments;
            uri = args[0];
            if (!uri) return false;
            ARIA2.request("addUri", [[uri]],
                function(result) {
                    console.debug(result);
                    //id:1
                    //jsonrpc:"2.0"
                    //result:"2"
                    $("#add-task-modal").modal('hide');
                    $("#add-task-modal uri-input").val("");
                    $("#add-task-alert").hide();
                }, 
                function(result) {
                    console.debug(result);

                    var error_msg = get_error(result);

                    $("#add-task-alert .alert-msg").text(error_msg);
                    $("#add-task-alert").show();
                    console.warn("add task error: "+error_msg);
                });
        },

        tell_active: function(keys) {
            ARIA2.request("tellActive", keys,
                function(result) {
                    console.debug(result);

                    if (!result.result) {
                        $("#main-alert .alert").addClass("alert-error");
                        $("#main-alert .alert-msg").html("<strong>Error: </strong>rpc result error.");
                        $("#main-alert").show();
                    }

                    result = ARIA2.status_fix(result.result);
                    $("#active-tasks-table").append($("#task-tpl").mustache({"tasks": result}));
                },
                function(result) {
                    console.debug(result);

                    var error_msg = get_error(result);

                    $("#main-alert .alert").addClass("alert-error");
                    $("#main-alert .alert-msg").html("<strong>Error: </strong>"+error_msg);
                    $("#main-alert").show();
                }
            );
        },

        tell_stoped: function(keys) {
            ARIA2.request("tellStopped", [0, 100],
                function(result) {
                    console.debug(result);

                    if (!result.result) {
                        $("#main-alert .alert").addClass("alert-error");
                        $("#main-alert .alert-msg").html("<strong>Error: </strong>rpc result error.");
                        $("#main-alert").show();
                    }

                    result = ARIA2.status_fix(result.result);
                    $("#active-tasks-table").append($("#task-tpl").mustache({"tasks": result}));
                },
                function(result) {
                    console.debug(result);

                    var error_msg = get_error(result);

                    $("#main-alert .alert").addClass("alert-error");
                    $("#main-alert .alert-msg").html("<strong>Error: </strong>"+error_msg);
                    $("#main-alert").show();
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
            for (var i=0; i<results.length; i++) {
                var result = results[i];

                result.status_icon = status_icon_map[result.status];
                result.title = get_title(result);
                result.progress = result.completedLength * 1.0 / result.totalLength * 100;
                result.completedLength = format_size(result.completedLength);
                result.totalLength = format_size(result.totalLength);
                result.uploadLength = format_size(result.uploadLength);
                result.uploadSpeed = format_size(result.uploadSpeed);
                result.downloadSpeed = format_size(result.downloadSpeed);
                result.uploadLength = format_size(result.uploadLength);

                result.numSeeders = parseInt(result.numSeeders);
            }
            return results;
        }

    }
})();
