import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SigningContainerComponent extends Component {
  @tracked isSigned = false;

  @action
  toggleSigned() {
    this.isSigned = !this.isSigned;
    if (this.isSigned) {
      alert("You've signed... there's no turning back now! 🖋️💀");
    }
  }
}
