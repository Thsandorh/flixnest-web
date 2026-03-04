import IComment from 'types/comment';
import CommentControl from './comment-control';
import { useEffect, useState } from 'react';
import firebaseServices from 'services/firebase-services';
import DetailMovie from 'types/detail-movie';

const DEFAULT_AVATAR = '/account-default-img.jpg';

export default function Comment({
  comment,
  movie,
  setComments,
}: {
  comment: IComment;
  movie: DetailMovie;
  setComments: React.Dispatch<React.SetStateAction<[] | IComment[]>>;
}) {
  const [isCommentEditing, setIsCommentEditing] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [avatarSrc, setAvatarSrc] = useState<string>(DEFAULT_AVATAR);

  const handleSubmitEditedComment = async (e: any) => {
    e.preventDefault();

    if (commentText === '') return;

    await firebaseServices.editMovieComment(movie.movie._id, commentText, comment.id!);

    setIsCommentEditing(false);
  };

  useEffect(() => {
    setCommentText(comment.text);
  }, [comment.text]);

  useEffect(() => {
    if (typeof comment.userAvata === 'string' && comment.userAvata.trim()) {
      setAvatarSrc(comment.userAvata);
      return;
    }

    setAvatarSrc(DEFAULT_AVATAR);
  }, [comment.userAvata]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCommentEditing) {
          if (commentText === '') {
            setCommentText(comment.text);
          }

          setIsCommentEditing(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommentEditing, commentText, comment.text]);

  return (
    <div className="p-3 rounded-lg shadow-sm">
      <div className="flex items-center space-x-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt="User Profile"
          className="rounded-full h-10 w-10 object-cover"
          onError={() => setAvatarSrc(DEFAULT_AVATAR)}
        />
        <div className="flex flex-row flex-nowrap items-center">
          <p className="font-semibold text-white mr-2">{comment.userName}</p>
          <span className="inline-block mx-1 text-gray-400 text-xs">•</span>
          <p className="text-xs text-gray-400">{comment.timeStamp}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-10"></div>
        <div className="flex-1">
          {isCommentEditing ? (
            <form onSubmit={handleSubmitEditedComment}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full text-gray-400 bg-transparent outline-none border border-gray-400 rounded-lg px-1 py-1"
              />
            </form>
          ) : (
            <p className="text-gray-400 mt-1">{commentText}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 mt-4">
        <div className="w-10"></div>
        <div className="flex-1">
          <CommentControl
            comment={comment}
            setIsCommentEditing={setIsCommentEditing}
            movie={movie}
            setComments={setComments}
          />
        </div>
      </div>
    </div>
  );
}
