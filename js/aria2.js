if (typeof ARIA2=="undefined"||!ARIA2) var ARIA2=(function(){
    var jsonrpc_interface;
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
                    $("#add-task-modal").modal('hide');
                }, 
                function(result) {
                    console.log("error: "+result.error.message);
                });
        },

    }
})();
