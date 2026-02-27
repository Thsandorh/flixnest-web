import IComment from 'types/comment';
import { INotification } from 'types/notification';
import DetailMovie from 'types/detail-movie';
import { toast } from 'react-toastify';
import { IRecentMovie } from 'types/recent-movie';
import MovieCollection from 'types/movie-collection';

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const firebaseServices = {
  getMovieCollection: async (userId: string) => {
    try {
      const res = await fetch(`/api/collection?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const data = await safeJson<{ movies: MovieCollection[] }>(res);
      return data?.movies ?? [];
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
      return [];
    }
  },

  addMovieToCollection: async (userId: string, movie: MovieCollection) => {
    const res = await fetch('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, movie }),
    });
    return res.ok;
  },

  removeMovieFromCollection: async (userId: string, movieId: string) => {
    const res = await fetch('/api/collection', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, movieId }),
    });
    return res.ok;
  },

  getMovieComments: async (movieId: string) => {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(movieId)}`);
      if (!res.ok) return [];
      const data = await safeJson<{ comments: IComment[] }>(res);
      return data?.comments ?? [];
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
      return [];
    }
  },

  addMovieComment: async (movieId: string, newComment: IComment) => {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(movieId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      });

      if (!res.ok) return newComment;
      const data = await safeJson<{ comment: IComment }>(res);
      return data?.comment ?? newComment;
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
      return newComment;
    }
  },

  editMovieComment: async (movieId: string, editedCommentText: string, commentId: string) => {
    try {
      await fetch(`/api/comments/${encodeURIComponent(movieId)}/${encodeURIComponent(commentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedCommentText }),
      });
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
    } finally {
      return editedCommentText;
    }
  },

  deleteMovieComment: async (movieId: string, commentId: string) => {
    try {
      await fetch(`/api/comments/${encodeURIComponent(movieId)}/${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
    }
  },

  likeComment: async (movieId: string, userId: string, comment: IComment) => {
    try {
      await fetch(
        `/api/comments/${encodeURIComponent(movieId)}/${encodeURIComponent(comment.id!)}/like`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
    }
  },

  unlikeComment: async (movieId: string, userId: string, comment: IComment) => {
    try {
      await fetch(
        `/api/comments/${encodeURIComponent(movieId)}/${encodeURIComponent(comment.id!)}/like`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
    }
  },

  createNotification: async (user: any, comment: IComment, movie: DetailMovie) => {
    try {
      const notification: INotification = {
        type: 'react',
        userCreatedName: user.name,
        userCreatedId: user.id,
        userReciveId: comment.userId,
        userReciveName: comment.userName,
        timestamp: new Date().toISOString(),
        movieSlug: movie.movie.slug,
        movieId: movie.movie._id,
        read: false,
      };

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (error: any) {
      toast.error('Da co loi xay ra...');
      console.log(error.message);
    }
  },

  deleteNotification: async (userReciveId: string, userCreatedId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userReciveId, userCreatedId }),
      });
    } catch (error: any) {
      console.log(error.message);
    }
  },

  readedNotification: async (notification: INotification) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notification.id, userReciveId: notification.userReciveId }),
    });
  },

  listenToUserNotifications: async (
    userId: string,
    handleReciveNotificationData: (notifications: INotification[]) => void
  ) => {
    const fetchNotifications = async () => {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = await safeJson<{ notifications: INotification[] }>(res);
      handleReciveNotificationData(data?.notifications ?? []);
    };

    await fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 5000);
    return () => clearInterval(intervalId);
  },

  storeRecentMovies: async (recentMovie: IRecentMovie, userId: string) => {
    try {
      await fetch('/api/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recentMovie }),
      });
    } catch (error: any) {
      console.log(error.message);
    }
  },

  getRecentMovies: async (userId: string) => {
    try {
      const res = await fetch(`/api/recent?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const data = await safeJson<{ movies: IRecentMovie[] }>(res);
      return data?.movies ?? [];
    } catch (error: any) {
      console.log(error.message);
      return [];
    }
  },

  getProgressWatchOfMovie: async (userId: string, movieId: string) => {
    try {
      const res = await fetch(
        `/api/recent/progress?userId=${encodeURIComponent(userId)}&movieId=${encodeURIComponent(movieId)}`
      );
      if (!res.ok) return { status: false };
      const data = await safeJson<{ status: boolean } & Record<string, unknown>>(res);
      return data ?? { status: false };
    } catch (error: any) {
      console.log(error.message);
      return { status: false };
    }
  },
};

export default firebaseServices;

