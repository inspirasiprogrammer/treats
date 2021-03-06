// Monitor server script startup and reload. Should be added at the end of entries
const monitorFn = () => {
    // Handle hot updates, copied with slight adjustments from webpack/hot/signal.js
    if (module.hot) {
        //eslint-disable-next-line
        const log = (type, msg) => console[type](msg);
        // TODO don't show this when sending signal instead of message
        log("log", "Handling Hot Module Reloading");
        const checkForUpdate = function checkForUpdate(fromUpdate) {
            module.hot
                .check()
                .then(updatedModules => {
                    if (!updatedModules) {
                        if (fromUpdate) log("log", "Update applied.");
                        else log("warn", "Cannot find update.");
                        return undefined;
                    }

                    return module.hot
                        .apply({
                            ignoreUnaccepted: true,
                            // TODO probably restart
                            onUnaccepted(data) {
                                log(
                                    "warn",
                                    `\u0007Ignored an update to unaccepted module ${data.chain.join(
                                        " -> "
                                    )}`
                                );
                            }
                        })
                        .then(renewedModules => {
                            require("webpack/hot/log-apply-result")(updatedModules, renewedModules);

                            checkForUpdate(true);
                        });
                })
                .catch(err => {
                    const status = module.hot.status();
                    if (["abort", "fail"].indexOf(status) >= 0) {
                        if (process.send) {
                            process.send("SSWP_HMR_FAIL");
                        }
                        log("warn", "Cannot apply update.");
                        log("warn", `${err.stack}` || err.message);
                        log(
                            "error",
                            "Quitting process - will reload on next file change\u0007\n\u0007\n\u0007"
                        );
                        process.exit(222);
                    } else {
                        log("warn", `Update failed: ${err.stack}` || err.message);
                    }
                });
        };

        process.on("message", message => {
            if (message !== "SSWP_HMR") return;

            if (module.hot.status() !== "idle") {
                log("warn", `Got signal but currently in ${module.hot.status()} state.`);
                log("warn", "Need to be in idle state to start hot update.");
                return;
            }

            checkForUpdate();
        });
    }

    // Tell our plugin we loaded all the code without initially crashing
    if (process.send) {
        process.send("SSWP_LOADED");
    }
};

module.exports = monitorFn;
