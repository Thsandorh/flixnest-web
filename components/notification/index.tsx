import { useCallback, useEffect, useState } from 'react';
import NotificationDropDown from './notification-dropdown';
import NotificationIcon from './notification-icon';
import NotificationMobile from './notification-mobile';
import { INotification, INotificationDropdownState } from 'types/notification';
import { useSelector } from 'react-redux';
import firebaseServices from 'services/firebase-services';

export default function Notification({
  isOnFixedHeader,
  notificationDropdownState,
  setNotificationDropdownState,
  isMobile = false,
  onCloseMenu,
}: {
  isOnFixedHeader: boolean;
  notificationDropdownState: INotificationDropdownState;
  setNotificationDropdownState: React.Dispatch<React.SetStateAction<INotificationDropdownState>>;
  isMobile?: boolean;
  onCloseMenu?: () => void;
}) {
  const user = useSelector((state: any) => state.auth.user);
  const [notifications, setNotifications] = useState<INotification[] | []>([]);
  const [notificationsUnreadCount, setNotificationUnreadCount] = useState<number>(0);

  const handleReciveNotificationData = useCallback((notifications: INotification[]) => {
    let tempCount = 0;

    notifications.forEach((item: INotification) => {
      if (!item.read) {
        tempCount++;
      }
    });

    setNotificationUnreadCount(tempCount);
    setNotifications(notifications);
  }, []);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined = undefined;

    const fetchNotifications = async () => {
      unsubscribe = await firebaseServices.listenToUserNotifications(
        user.id,
        handleReciveNotificationData
      );
    };

    void fetchNotifications();

    return () => {
      if (unsubscribe) {
        console.log('Unsubscribing from notifications...');
        unsubscribe();
      }
    };
  }, [user, handleReciveNotificationData]);

  // base on isOnHeaderDefault to choose what state choosing
  const isOpen = isOnFixedHeader
    ? notificationDropdownState.isOpenInHeaderFixed
    : notificationDropdownState.isOpenInHeaderDefault;

  // If mobile, return mobile component
  if (isMobile && onCloseMenu) {
    return (
      <NotificationMobile
        notifications={notifications}
        notificationsUnreadCount={notificationsUnreadCount}
        onCloseMenu={onCloseMenu}
        onMarkAllAsRead={() => {
          // Add mark all as read functionality here
          console.log('Mark all as read');
        }}
      />
    );
  }

  return (
    <div>
      <NotificationIcon
        setNotificationDropdownState={setNotificationDropdownState}
        isOnFixedHeader={isOnFixedHeader}
        notificationsUnreadCount={notificationsUnreadCount}
      />
      {isOpen && (
        <NotificationDropDown
          notificationDropdownState={notificationDropdownState}
          setNotificationDropdownState={setNotificationDropdownState}
          notifications={notifications}
        />
      )}
    </div>
  );
}
