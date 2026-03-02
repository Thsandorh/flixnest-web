import { IoSearch } from 'react-icons/io5';
import SubType from './sub-type';
import SubCountries from './sub-countries';
import LoginSignUpIcon from '../auth/login-signup-icon';
import { useSelector } from 'react-redux';
import AccountProfileIcon from '../account/account-profile-icon';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Notification from '../notification';
import { INotificationDropdownState } from 'types/notification';
import Link from 'next/link';

export default function HeaderDefault({
  isShowFixedHeader,
  notificationDropdownState,
  setNotificationDropdownState,
}: {
  isShowFixedHeader: boolean;
  notificationDropdownState: INotificationDropdownState;
  setNotificationDropdownState: React.Dispatch<React.SetStateAction<INotificationDropdownState>>;
}) {
  const user = useSelector((state: any) => state.auth.user);
  const [authenticatedUser, setAuthenticatedUser] = useState<object | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const pathname = usePathname();

  useEffect(() => {
    setAuthenticatedUser(user);
    setLoading(false);
  }, [user]);

  return (
    <header className="absolute top-0 left-0 right-0 z-20">
      <div className="header-container flex items-center justify-between container-wrapper gap-6 py-4">
        <Link
          className="tv-nav-link block rounded-full px-4 py-2 text-2xl font-extrabold tracking-tight text-custome-red"
          href="/"
          data-tv-autofocus="true"
        >
          FLIXNEST
        </Link>
        <ul className="flex flex-grow justify-center items-center gap-2 font-semibold text-lg">
          <li>
            <Link
              className={`tv-nav-link rounded-full px-5 py-3 hover:text-custome-red ${
                pathname === '/movies/format/phim-le' && 'text-custome-red'
              }`}
              href="/movies/format/phim-le"
            >
              Movies
            </Link>
          </li>
          <li>
            <Link
              className={`tv-nav-link rounded-full px-5 py-3 hover:text-custome-red ${
                pathname === '/movies/format/phim-bo' && 'text-custome-red'
              }`}
              href="/movies/format/phim-bo"
            >
              Series
            </Link>
          </li>
          <li>
            <Link
              className={`tv-nav-link rounded-full px-5 py-3 hover:text-custome-red ${
                pathname === '/movies/format/hoat-hinh' && 'text-custome-red'
              }`}
              href="/movies/format/hoat-hinh"
            >
              Animation
            </Link>
          </li>
          <li>
            <Link
              className={`tv-nav-link rounded-full px-5 py-3 hover:text-custome-red ${
                pathname === '/movies/format/tv-shows' && 'text-custome-red'
              }`}
              href="/movies/format/tv-shows"
            >
              TV show
            </Link>
          </li>
          <li className={`relative group ${!isShowFixedHeader && 'group'}`}>
            <button
              type="button"
              className="tv-nav-link rounded-full px-5 py-3 hover:text-custome-red"
            >
              Genres
            </button>
            <SubType />
          </li>
          <li className={`relative group ${!isShowFixedHeader && 'group'}`}>
            <button
              type="button"
              className="tv-nav-link rounded-full px-5 py-3 hover:text-custome-red"
            >
              Countries
            </button>
            <SubCountries />
          </li>
        </ul>
        <div className="flex w-36 gap-x-3 items-center justify-end h-[3.62rem]">
          <Link className="tv-icon-button inline-flex items-center justify-center rounded-full px-3 hover:text-custome-red" href="/search">
            <IoSearch size={25} />
          </Link>
          {!loading &&
            (authenticatedUser ? (
              <AccountProfileIcon authenticatedUser={authenticatedUser} isOnFixedHeader={false}/>
            ) : (
              <LoginSignUpIcon />
            ))}
          <div className={`relative h-full flex items-center`}>
            {!loading && authenticatedUser && (
              <Notification
                isOnFixedHeader={false}
                notificationDropdownState={notificationDropdownState}
                setNotificationDropdownState={setNotificationDropdownState}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
