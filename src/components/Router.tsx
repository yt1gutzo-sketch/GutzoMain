import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Route = '/' | '/T&C' | '/refund_policy' | '/privacy_policy';

interface RouterContextType {
  currentRoute: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<Route>('/');

  // Update document title based on route
  const updateDocumentTitle = useCallback((route: Route) => {
    const titles: Record<Route, string> = {
      '/': 'Gutzo - Healthy Meals in Coimbra',
      '/T&C': 'Terms & Conditions - Gutzo',
      '/refund_policy': 'Refund Policy - Gutzo',
      '/privacy_policy': 'Privacy Policy - Gutzo'
    };
    document.title = titles[route];
  }, []);

  // Initialize route from browser URL
  useEffect(() => {
    const path = window.location.pathname as Route;
    const validRoutes: Route[] = ['/', '/T&C', '/refund_policy', '/privacy_policy'];
    
    if (validRoutes.includes(path)) {
      // Scroll to top immediately on initial load if not on homepage
      if (path !== '/') {
        window.scrollTo(0, 0);
      }
      setCurrentRoute(path);
      updateDocumentTitle(path);
    }
  }, [updateDocumentTitle]);

  // Navigation function
  const navigate = useCallback((route: Route) => {
    if (route !== currentRoute) {
      try {
        // Scroll to top immediately before route change
        window.scrollTo(0, 0);
        // Update browser history
        window.history.pushState({}, '', route);
        // Update state directly
        setCurrentRoute(route);
        updateDocumentTitle(route);
        // Force scroll to top after state update
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 0);
      } catch (error) {
        // Fallback to hash routing if pushState fails
        console.warn('Browser history not supported, falling back to hash routing');
        window.scrollTo(0, 0);
        window.location.hash = route === '/' ? '' : route;
        // Force scroll to top after hash change
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 0);
      }
    }
  }, [currentRoute, updateDocumentTitle]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as Route;
      const validRoutes: Route[] = ['/', '/T&C', '/refund_policy', '/privacy_policy'];
      
      if (validRoutes.includes(path)) {
        window.scrollTo(0, 0);
        setCurrentRoute(path);
        updateDocumentTitle(path);
        // Force scroll to top after state update
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateDocumentTitle]);

  return (
    <RouterContext.Provider value={{ currentRoute, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (context === undefined) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}