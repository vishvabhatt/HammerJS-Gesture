import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  public imageUrl = '../assets/clouds.jpg';
  public eventOutput: string = '';

  constructor() {}
  public onEventOutput(event: string) {
    this.eventOutput = this.eventOutput + event;
  }
}
