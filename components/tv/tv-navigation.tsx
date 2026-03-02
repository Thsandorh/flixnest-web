'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[role="button"]:not([aria-disabled="true"]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type Direction = 'left' | 'right' | 'up' | 'down';

const isTextEditable = (element: HTMLElement | null) => {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.isContentEditable
  );
};

const isVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (element.closest('[aria-hidden="true"]')) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const getFocusableCandidates = () =>
  Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);

const focusElement = (element: HTMLElement) => {
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'smooth',
  });
};

const getCenter = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return {
    rect,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};

const isCandidateInDirection = (
  direction: Direction,
  current: ReturnType<typeof getCenter>,
  candidate: ReturnType<typeof getCenter>
) => {
  const horizontalTolerance = Math.max(16, current.rect.width * 0.18);
  const verticalTolerance = Math.max(16, current.rect.height * 0.18);

  switch (direction) {
    case 'left':
      return candidate.x < current.x - horizontalTolerance;
    case 'right':
      return candidate.x > current.x + horizontalTolerance;
    case 'up':
      return candidate.y < current.y - verticalTolerance;
    case 'down':
      return candidate.y > current.y + verticalTolerance;
  }
};

const getDirectionalScore = (
  direction: Direction,
  current: ReturnType<typeof getCenter>,
  candidate: ReturnType<typeof getCenter>
) => {
  const dx = candidate.x - current.x;
  const dy = candidate.y - current.y;
  const primaryDistance = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
  const secondaryDistance = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
  return primaryDistance + secondaryDistance * 2.5;
};

const findClosestCandidate = (
  currentElement: HTMLElement,
  candidates: HTMLElement[],
  direction: Direction
) => {
  const current = getCenter(currentElement);

  return candidates
    .filter((candidate) => candidate !== currentElement)
    .map((candidate) => ({
      element: candidate,
      center: getCenter(candidate),
    }))
    .filter(({ center }) => isCandidateInDirection(direction, current, center))
    .sort((left, right) => getDirectionalScore(direction, current, left.center) - getDirectionalScore(direction, current, right.center))[0]
    ?.element;
};

export default function TvNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.add('tv-shell');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (isTextEditable(activeElement)) {
        return;
      }

      const directionMap: Record<string, Direction> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };

      if (event.key in directionMap) {
        const candidates = getFocusableCandidates();
        if (candidates.length === 0) return;

        event.preventDefault();

        const direction = directionMap[event.key];
        if (!activeElement || !candidates.includes(activeElement)) {
          focusElement(candidates[0]);
          return;
        }

        const nextCandidate = findClosestCandidate(activeElement, candidates, direction);
        if (nextCandidate) {
          focusElement(nextCandidate);
        }
      }

      if ((event.key === 'Enter' || event.key === ' ') && activeElement && !isTextEditable(activeElement)) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName !== 'a' && tagName !== 'button') {
          activeElement.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const autofocusTarget = document.querySelector<HTMLElement>('[data-tv-autofocus="true"]');
    if (autofocusTarget) {
      window.requestAnimationFrame(() => focusElement(autofocusTarget));
    }
  }, [pathname]);

  return null;
}
