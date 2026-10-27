package com.bomberos.monitor;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

public class MainApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            AudioAttributes alarmAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();

            // 1. Canal General (Por defecto)
            createChannel(notificationManager, "emergency_alerts_v2", "Emergencias", "Alertas generales de emergencia", "dispatch_tone", alarmAttributes, NotificationManager.IMPORTANCE_HIGH);
            
            // 2. Canal Fuego (Incendios estructurales, forestales, etc)
            createChannel(notificationManager, "alerts_fire", "Incendios", "Tono específico para claves de fuego", "tone_fire", alarmAttributes, NotificationManager.IMPORTANCE_HIGH);
            
            // 3. Canal Rescate (Accidentes, rescates vehiculares, etc)
            createChannel(notificationManager, "alerts_rescue", "Rescates", "Tono específico para claves de rescate", "tone_rescue", alarmAttributes, NotificationManager.IMPORTANCE_HIGH);
            
            // 4. Canal Comunicados (Avisos administrativos, citaciones)
            // IMPORTANCE_DEFAULT para que suene, pero sin ser tan invasivo (sin heads-up urgente)
            createChannel(notificationManager, "alerts_notes", "Comunicados", "Avisos y citaciones de comandancia", "tone_notes", alarmAttributes, NotificationManager.IMPORTANCE_DEFAULT);
        }
    }

    private void createChannel(NotificationManager manager, String id, String name, String desc, String soundName, AudioAttributes attributes, int importance) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (manager.getNotificationChannel(id) == null) {
                NotificationChannel channel = new NotificationChannel(id, name, importance);
                channel.setDescription(desc);
                channel.enableLights(true);
                channel.enableVibration(true);

                Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/raw/" + soundName);
                channel.setSound(soundUri, attributes);

                manager.createNotificationChannel(channel);
            }
        }
    }
}
