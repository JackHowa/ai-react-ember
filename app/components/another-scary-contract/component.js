import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import { tagName } from '@ember-decorators/component';

@classic // classic component instead of glimmer
@tagName('') // should be empty
export default class AnotherScaryContract extends Component {} // should be class empty
