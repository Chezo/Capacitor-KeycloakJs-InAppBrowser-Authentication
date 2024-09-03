import {Injectable, NgZone} from '@angular/core';
import Keycloak, {KeycloakProfile} from 'keycloak-js';
import {Browser} from '@capacitor/browser';
import {App} from '@capacitor/app';
import {jwtDecode} from 'jwt-decode';
import {BehaviorSubject, Observable} from 'rxjs';
import {environment} from '../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private keycloak: Keycloak;
  private config?;
  private userChanged: BehaviorSubject<KeycloakProfile | undefined> = new BehaviorSubject<KeycloakProfile | undefined>(undefined);
  userChanged$: Observable<KeycloakProfile | undefined> = this.userChanged.asObservable();

  public isAndroid: boolean = false;
  public isIos: boolean = false;
  public isWeb: boolean = false;

  constructor(private ngZone: NgZone) {
    this.checkPlatform();
    this.config = this.getPlatformConfig();
    this.keycloak = new Keycloak(this.config);


    App.addListener('appUrlOpen', async (data: any) => {
      if (data.url.includes(`${environment.mobileLogoutRedirect}`)) {
        await this.handleMobileLogoutRedirect();
      }

      if (data.url.includes(`${environment.mobileLoginRedirect}`)) {
        await this.handleMobileLoginRedirect(data);
      }
    });
  }

  private async handleMobileLoginRedirect(data: any) {
    const params = new URLSearchParams(data.url.split('#')[1]);
    const code = params.get('code');
    const codeVerifier = localStorage.getItem('pkce_code_verifier');

    if (!code || !codeVerifier) {
      console.error('Missing code parameter in the URL');
      return;
    }

    try {
      const response = await fetch(
        `${environment.keycloakUrl}/realms/${environment.realm}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'keycloak-mobile',
            code,
            redirect_uri: `${environment.mobileLoginRedirect}`,
            code_verifier: codeVerifier,
          }),
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error('Token exchange failed:', response.status, response.statusText, errorMessage);
        throw new Error('Token exchange failed: ' + response.statusText);
      }

      const data = await response.json();
      this.setTokens(data);

      if (this.keycloak.authenticated) {
        this.loadUserProfile();
      }
      await Browser.close();
    } catch (error) {
      console.error('Error during token exchange:', error);
    }
  }

  private setTokens(data: any) {
    this.keycloak.token = data.access_token;
    this.keycloak.tokenParsed = jwtDecode(data.access_token);
    this.keycloak.refreshToken = data.refresh_token;
    this.keycloak.idToken = data.id_token;
    this.keycloak.authenticated = true;
  }

  private async handleMobileLogoutRedirect() {
    this.clearSession();
    await Browser.close();
  }

  private clearSession() {
    this.keycloak.clearToken();
    this.keycloak.authenticated = false;
    this.userChanged.next(undefined);
  }

  private loadUserProfile() {
    this.ngZone.run(this.keycloak.loadUserProfile).then((user) => {
      this.userChanged.next(user);
    }).catch(err => {
      console.error('Error loading user profile:', err);
    });
  }

  private getPlatformConfig() {
    return {
      url: `${environment.keycloakUrl}`,
      realm: `${environment.realm}`,
      clientId: this.isMobile() ? 'keycloak-mobile' : 'keycloak-web',
      redirectUri: this.isMobile() ? `${environment.mobileLoginRedirect}}` : window.location.origin,
    };
  }

  private isMobile(): boolean {
    return this.isAndroid || this.isIos;
  }

  init() {
    this.keycloak.init({
      checkLoginIframe: false
    }).then(authenticated => {
      if (authenticated) {
        this.loadUserProfile();
      }
    });
  }

  async login(): Promise<void> {
    if (this.isMobile()) {
      const codeVerifier = this.generateCodeVerifier();
      localStorage.setItem('pkce_code_verifier', codeVerifier);
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      let loginUrl = `${environment.keycloakUrl}/realms/${environment.realm}/protocol/openid-connect/auth?client_id=keycloak-mobile&redirect_uri=${environment.mobileLoginRedirect}&state=4b845a1c-c150-4366-8838-b6ac439b922f&response_mode=fragment&response_type=code&scope=openid&nonce=a088848f-cf54-474a-91e6-03390d38c892`;
      loginUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;

      await Browser.open({url: loginUrl, windowName: '_blank'});
    } else {
      this.keycloak.login();
    }
  }

  async logout() {
    if (this.isMobile()) {
      const logoutUrl = `${environment.keycloakUrl}/realms/${environment.realm}/protocol/openid-connect/logout?client_id=keycloak-mobile&post_logout_redirect_uri=${environment.mobileLogoutRedirect}`;
      await Browser.open({url: logoutUrl, windowName: '_blank'});
    } else {
      this.keycloak.logout();
    }

  }

  private generateCodeVerifier(): string {
    const array = new Uint32Array(56);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private checkPlatform(): void {
    const userAgent = navigator.userAgent;
    this.isAndroid = /Android/i.test(userAgent);
    this.isIos = /iPhone|iPad|iPod/i.test(userAgent);
    this.isWeb = !(this.isAndroid || this.isIos);
  }
}
