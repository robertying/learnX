Due to the limit of current APIs, `Push Notifications` is provided by third-party services which is not attached to Tsinghua University in any way. This approach for notifications may impose certain threats to your credentials. Please read the following agreement and proceed at your own discretion. You need to acknowledge this agreement in order to use `Push Notifications` for this App.

> Note:
>
> `Push Notifications` here is for remote notifications; If you only need local `Reminder Notifications`, you may not need this service.

### Limitations

Since this is not an official App, there is no way for me to set up real-time push notification services without direct access to the school server.

### Mechanism

To best mimic the notification behavior, I use the third-party service `Firebase` to do pooling every few minutes and send new content to the App.

- First, you need to create a new account via `Firebase Auth`. This account is independent of your Tsinghua account and is only used for this `Push Notifications` service.
- After you enable `Push Notifications`, the App will upload your Tsinghua credentials to the backend along with your device token, which are managed and protected by the newly-created account.
- Your Tsinghua password will be encrypted using `AES` algorithm and then be stored into the database.
- Every few minutes the service will get the password from the database and decrypt it. The service then uses the original password to access APIs and sends new content to the device via its token.

### Safety Concerns

There are a few scenarios that can demonstrate the security of the services:

- The hacker gets full control of my Google Account, hence the complete compromise of Firebase services which is authenticated via Google. Your password would be leaked, because the hacker now also gets hold of the key for AES encryptions.
- The hacker gets full control of your Firebase Auth account. Your password is safe since the hacker does not know the encryption key.
- The hacker breaches the Firebase database and gets your data. Your password is safe since the hacker does not know the encryption key.
- The hacker knows the AES encryption key. Your password will be temporarily at risk since the hacker knows the encryption key. The risk will be eliminated once I change the key and re-encrypt your password.
- _I am the hacker_. Your password would be leaked, because I know the key for AES encryptions.

### Prerequisites

- You need to give the App proper permissions for push notifications.
- For Android users, you need working Google Services to receive notifications.

---

By pressing the `Acknowledge` button, you acknowledge and agree to the [privacy policy](https://learnx.robertying.io/en/privacy) along with the agreement above.
