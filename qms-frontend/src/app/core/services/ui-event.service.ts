import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiEventService {
  private _openNewForm = new Subject<void>();
  openNewForm$ = this._openNewForm.asObservable();

  triggerNewForm() {
    this._openNewForm.next();
  }
}
