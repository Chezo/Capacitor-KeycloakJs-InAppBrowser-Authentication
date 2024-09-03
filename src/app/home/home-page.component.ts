import {Component} from '@angular/core';
import {
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {JsonPipe, NgForOf, NgIf} from "@angular/common";
import {KeycloakProfile} from "keycloak-js";
import {KeycloakService} from "../auth/keycloak.service";

@Component({
  selector: 'app-tabs',
  templateUrl: 'home-page.component.html',
  styleUrls: ['home-page.component.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonButton, IonCol, IonContent, IonGrid, IonHeader, IonItem, IonList, IonRow, IonTitle, IonToolbar, JsonPipe, NgForOf, NgIf],
})
export class HomePage {


  user?: KeycloakProfile;


  constructor(protected keycloakService: KeycloakService) {
    this.keycloakService.init()
    this.keycloakService.userChanged$.subscribe((user) => {
      this.user = user;
    })
  }

  async login() {
    this.keycloakService.login();
  }

  logout() {
    this.keycloakService.logout()
  }

}
