import Model from './activitylog-mvc/Model.js';
import Controller from './activitylog-mvc/Controller.js';
import View from './activitylog-mvc/View.js';

export default class ActivityLog {
  constructor() {
    this.activityLog = new Controller(new Model(), new View());
  }
}
