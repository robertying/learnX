declare module "@react-native-community/push-notification-ios" {
  export interface PushNotificationPermissions {
    readonly alert?: boolean;
    readonly badge?: boolean;
    readonly sound?: boolean;
  }

  export interface PushNotification {
    /**
     * An alias for `getAlert` to get the notification's main message string
     */
    getMessage(): string | Object;

    /**
     * Gets the sound string from the `aps` object
     */
    getSound(): string;

    /**
     * Gets the category string from the `aps` object
     */
    getCategory(): string;

    /**
     * Gets the notification's main message from the `aps` object
     */
    getAlert(): string | Object;

    /**
     * Gets the content-available number from the `aps` object
     */
    getContentAvailable(): number;

    /**
     * Gets the badge count number from the `aps` object
     */
    getBadgeCount(): number;

    /**
     * Gets the data object on the notif
     */
    getData(): Object;

    /**
     * iOS Only
     * Signifies remote notification handling is complete
     */
    finish(result: string): void;
  }

  interface PresentLocalNotificationDetails {
    readonly alertBody: string;
    readonly alertAction: string;
    readonly soundName?: string;
    readonly category?: string;
    readonly userInfo?: Object;
    readonly applicationIconBadgeNumber?: number;
  }

  interface ScheduleLocalNotificationDetails {
    readonly alertAction?: string;
    readonly alertBody?: string;
    readonly alertTitle?: string;
    readonly applicationIconBadgeNumber?: number;
    readonly category?: string;
    readonly fireDate?: number | string;
    readonly isSilent?: boolean;
    readonly repeatInterval?:
      | "year"
      | "month"
      | "week"
      | "day"
      | "hour"
      | "minute";
    readonly soundName?: string;
    readonly userInfo?: Object;
  }

  export type PushNotificationEventName =
    | "notification"
    | "localNotification"
    | "register"
    | "registrationError";

  interface FetchResult {
    readonly NewData: "UIBackgroundFetchResultNewData";
    readonly NoData: "UIBackgroundFetchResultNoData";
    readonly ResultFailed: "UIBackgroundFetchResultFailed";
  }

  /**
   * Handle push notifications for your app, including permission handling and icon badge number.
   * @see https://facebook.github.io/react-native/docs/pushnotificationios.html#content
   *
   * //FIXME: BGR: The documentation seems completely off compared to the actual js implementation. I could never get the example to run
   */
  export interface PushNotificationIOSStatic {
    /**
     * iOS fetch results that best describe the result of a finished remote notification handler.
     * For a list of possible values, see `PushNotificationIOS.FetchResult`.
     */
    readonly FetchResult: FetchResult;
    /**
     * Schedules the localNotification for immediate presentation.
     * details is an object containing:
     * alertBody : The message displayed in the notification alert.
     * alertAction : The "action" displayed beneath an actionable notification. Defaults to "view";
     * soundName : The sound played when the notification is fired (optional).
     * category : The category of this notification, required for actionable notifications (optional).
     * userInfo : An optional object containing additional notification data.
     * applicationIconBadgeNumber (optional) : The number to display as the app's icon badge. The default value of this property is 0, which means that no badge is displayed.
     */
    presentLocalNotification(details: PresentLocalNotificationDetails): void;

    /**
     * Schedules the localNotification for future presentation.
     * details is an object containing:
     * fireDate : The date and time when the system should deliver the notification.
     * alertBody : The message displayed in the notification alert.
     * alertAction : The "action" displayed beneath an actionable notification. Defaults to "view";
     * soundName : The sound played when the notification is fired (optional).
     * category : The category of this notification, required for actionable notifications (optional).
     * userInfo : An optional object containing additional notification data.
     * applicationIconBadgeNumber (optional) : The number to display as the app's icon badge. Setting the number to 0 removes the icon badge.
     */
    scheduleLocalNotification(details: ScheduleLocalNotificationDetails): void;

    /**
     * Cancels all scheduled localNotifications
     */
    cancelAllLocalNotifications(): void;

    /**
     * Cancel local notifications.
     * Optionally restricts the set of canceled notifications to those notifications whose userInfo fields match the corresponding fields in the userInfo argument.
     */
    cancelLocalNotifications(userInfo: Object): void;

    /**
     * Sets the badge number for the app icon on the home screen
     */
    setApplicationIconBadgeNumber(number: number): void;

    /**
     * Gets the current badge number for the app icon on the home screen
     */
    getApplicationIconBadgeNumber(callback: (badge: number) => void): void;

    /**
     * Gets the local notifications that are currently scheduled.
     */
    getScheduledLocalNotifications(
      callback: (
        notifications: readonly ScheduleLocalNotificationDetails[]
      ) => void
    ): void;

    /**
     * Attaches a listener to remote notifications while the app is running in the
     * foreground or the background.
     *
     * The handler will get be invoked with an instance of `PushNotificationIOS`
     *
     * The type MUST be 'notification'
     */
    addEventListener(
      type: "notification" | "localNotification",
      handler: (notification: PushNotification) => void
    ): void;

    /**
     * Fired when the user registers for remote notifications.
     *
     * The handler will be invoked with a hex string representing the deviceToken.
     *
     * The type MUST be 'register'
     */
    addEventListener(
      type: "register",
      handler: (deviceToken: string) => void
    ): void;

    /**
     * Fired when the user fails to register for remote notifications.
     * Typically occurs when APNS is having issues, or the device is a simulator.
     *
     * The handler will be invoked with {message: string, code: number, details: any}.
     *
     * The type MUST be 'registrationError'
     */
    addEventListener(
      type: "registrationError",
      handler: (error: {
        readonly message: string;
        readonly code: number;
        readonly details: any;
      }) => void
    ): void;

    /**
     * Removes the event listener. Do this in `componentWillUnmount` to prevent
     * memory leaks
     */
    removeEventListener(
      type: PushNotificationEventName,
      handler:
        | ((notification: PushNotification) => void)
        | ((deviceToken: string) => void)
        | ((error: {
            readonly message: string;
            readonly code: number;
            readonly details: any;
          }) => void)
    ): void;

    /**
     * Requests all notification permissions from iOS, prompting the user's
     * dialog box.
     */
    requestPermissions(
      permissions?: readonly PushNotificationPermissions[]
    ): void;

    /**
     * Requests all notification permissions from iOS, prompting the user's
     * dialog box.
     */
    requestPermissions(
      permissions?: PushNotificationPermissions
    ): Promise<PushNotificationPermissions>;

    /**
     * Unregister for all remote notifications received via Apple Push
     * Notification service.
     * You should call this method in rare circumstances only, such as when
     * a new version of the app removes support for all types of remote
     * notifications. Users can temporarily prevent apps from receiving
     * remote notifications through the Notifications section of the
     * Settings app. Apps unregistered through this method can always
     * re-register.
     */
    abandonPermissions(): void;

    /**
     * See what push permissions are currently enabled. `callback` will be
     * invoked with a `permissions` object:
     *
     *  - `alert` :boolean
     *  - `badge` :boolean
     *  - `sound` :boolean
     */
    checkPermissions(
      callback: (permissions: PushNotificationPermissions) => void
    ): void;

    /**
     * This method returns a promise that resolves to either the notification
     * object if the app was launched by a push notification, or `null` otherwise.
     */
    getInitialNotification(): Promise<PushNotification>;
  }

  declare const PushNotificationIOS: PushNotificationIOSStatic;
  export default PushNotificationIOS;
}
