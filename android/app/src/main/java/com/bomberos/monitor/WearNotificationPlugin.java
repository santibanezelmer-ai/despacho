package com.bomberos.monitor;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WearNotification")
public class WearNotificationPlugin extends Plugin {

    private static final String CHANNEL_ID = "emergency_alerts_v2"; // Mismo canal de alta prioridad que usa tu App

    @Override
    public void load() {
        createNotificationChannel();
    }

    @PluginMethod
    public void send(PluginCall call) {
        String title = call.getString("title", "Alerta de Despacho");
        String body = call.getString("body", "Nueva emergencia.");
        Integer idOpt = call.getInt("id", (int) System.currentTimeMillis());
        int notificationId = idOpt != null ? idOpt : (int) System.currentTimeMillis();
        boolean enableVoiceReply = Boolean.TRUE.equals(call.getBoolean("enableVoiceReply", false));

        Context context = getContext();

        // 1. Crear la notificación base para el teléfono
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher) // Ícono por defecto, se puede personalizar
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setAutoCancel(true);

        // 2. Extensión específica para el reloj (Wear OS)
        NotificationCompat.WearableExtender wearableExtender = new NotificationCompat.WearableExtender();
        
        // Agregar opción de "Responder por Voz" (Solo visible en el reloj)
        if (enableVoiceReply) {
            String replyLabel = "Dictar estado...";
            RemoteInput remoteInput = new RemoteInput.Builder("extra_voice_reply")
                    .setLabel(replyLabel)
                    .build();

            // Intent para procesar cuando se envía el audio convertido a texto
            Intent replyIntent = new Intent(context, MainActivity.class);
            replyIntent.setAction("com.bomberos.monitor.VOICE_REPLY");
            replyIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            PendingIntent replyPendingIntent = PendingIntent.getActivity(
                    context, 
                    notificationId, 
                    replyIntent, 
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );

            NotificationCompat.Action action =
                    new NotificationCompat.Action.Builder(
                            android.R.drawable.ic_btn_speak_now,
                            "🎤 Responder (Voz)", 
                            replyPendingIntent)
                            .addRemoteInput(remoteInput)
                            .build();

            wearableExtender.addAction(action);
        }

        // Aplicamos la extensión a la notificación
        builder.extend(wearableExtender);

        // 3. Emitir la notificación
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        try {
            notificationManager.notify(notificationId, builder.build());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Permiso denegado para notificaciones: " + e.getMessage());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Despachos y Emergencias";
            String description = "Canal de alta prioridad para despachos";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);

            NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
