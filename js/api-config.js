(function () {
    "use strict";
    var base = window.STEPWAY_API_BASE_URL;
    if (typeof base !== "string" || !/^https?:\/\//.test(base)) {
        throw new Error("Set STEPWAY_API_BASE_URL before loading application scripts.");
    }
    base = base.replace(/\/+$/, "");
    window.stepwayApi = function (path) {
        return base + path;
    };
}());
