import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BGyv-wkUJ0c4iuBX4IsYhtK8FKsI_1bBrTQK56zg1G9qvHpbKGnYJeQofi1eXp6ezex7KvJA7qppiPdn068SMPY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getPlatformName(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** Check if push notifications are supported */
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Check if already subscribed */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/** Register service worker */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

/** Request notification permission and subscribe */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save to database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const keys = subscription.toJSON().keys;
    if (!keys) return false;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh!,
        auth_key: keys.auth!,
        platform: getPlatformName(),
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("Failed to save push subscription:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Push subscribe error:", err);
    return false;
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error("Push unsubscribe error:", err);
  }
}

/** Send push to specific users via edge function */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  options?: { icon?: string; url?: string; tag?: string }
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke("send-push", {
    body: {
      user_ids: userIds,
      title,
      body,
      ...options,
    },
  });

  if (error) {
    console.error("send-push invoke error:", error);
    return { sent: 0, failed: 0 };
  }

  return data;
}
