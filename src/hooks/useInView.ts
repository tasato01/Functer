import { useState, useEffect, useRef, type RefObject } from 'react';

/**
 * Hook to detect if an element is in the viewport using IntersectionObserver.
 * Returns true if the element is intersecting.
 * 
 * @param options IntersectionObserver options
 * @returns [ref, isInView]
 */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit): [RefObject<T | null>, boolean] {
    const ref = useRef<T>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsInView(entry.isIntersecting);
        }, options);

        observer.observe(element);

        return () => {
            if (element) observer.unobserve(element);
        };
    }, [options]);

    return [ref, isInView];
}
