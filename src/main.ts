import './ui/styles.css';
import { createTeamPage } from './app/pages/create-team';
import { dashboardPage } from './app/pages/dashboard';
import { landingPage } from './app/pages/landing';
import { invitePage, loginPage } from './app/pages/login';
import { startRouter } from './app/router';

startRouter(
  document.getElementById('app')!,
  {
    '/': landingPage,
    '/criar': createTeamPage,
    '/entrar': loginPage,
    '/convite': invitePage,
    '/app': dashboardPage,
  },
  '/',
);
