package com.bomberos.monitor;

import android.app.Activity;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        AppUpdateManager appUpdateManager = AppUpdateManagerFactory.create(getContext());
        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();

        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            JSObject ret = new JSObject();
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
                // Hay actualización disponible
                ret.put("updateAvailable", true);
                ret.put("availableVersionCode", appUpdateInfo.availableVersionCode());
                
                // Mostrar un pequeño Toast informativo (no intrusivo)
                activity.runOnUiThread(() -> 
                    Toast.makeText(getContext(), "¡Hay una nueva versión de la app disponible en Google Play!", Toast.LENGTH_LONG).show()
                );
            } else {
                ret.put("updateAvailable", false);
            }
            call.resolve(ret);
        }).addOnFailureListener(e -> call.reject("Error al verificar actualizaciones: " + e.getMessage()));
    }
}
