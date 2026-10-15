import { useEffect, useState } from 'react';
import { Header } from './components/Header.tsx';
import { tracker } from './engine/tracker.ts';
import { useI18n } from './i18n/index.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { FaqPage } from './pages/FaqPage.tsx';
import { WalletPage } from './pages/WalletPage.tsx';

type Route = { name: 'dashboard' } | { name: 'faq' } | { name: 'wallet'; address: string } | { name: 'missing' };

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/' || path === '') return { name: 'dashboard' };
  if (path === '/faq') return { name: 'faq' };
  const wallet = path.match(/^\/wallet\/([^/?#]+)/);
  if (wallet) return { name: 'wallet', address: decodeURIComponent(wallet[1]) };
  return { name: 'missing' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function App() {
  const route = useRoute();
  const { t } = useI18n();

  useEffect(() => {
    tracker.start();
    return () => tracker.stop();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <Header active={route.name} />
      <main id="main" className="page" tabIndex={-1}>
        {route.name === 'dashboard' && <Dashboard />}
        {route.name === 'faq' && <FaqPage />}
        {route.name === 'wallet' && <WalletPage address={route.address} />}
        {route.name === 'missing' && (
          <div className="page-title">
            <h1>{t('misc.notFound')}</h1>
            <p>
              <a href="#/">{t('wallet.back')}</a>
            </p>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <p>{t('footer.note')}</p>
      </footer>
    </>
  );
}
