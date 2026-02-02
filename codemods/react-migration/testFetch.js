const { fetchData } = require('./utils/fetch');
const { consoleC } = require('./utils/colorized-console');

(async () => {
  const EXAMPLES = [...Array(200)].map((_, i) => ({
    input: `<div>hi ${i}</hi>`,
    output: `const HiMessage = () => <div>hi ${i}</hi>;\n\nexport default HiMessage;'`
  }));

  const MESSAGES = [
    `{{!-- tomster-submit-message.hbs --}}\n<div class="messages">\n<aside>\n  <div class="avatar is-active" title="Tomster's avatar">T</div>\n</aside>\n<section>\n  <h4 class="username">\n    Tomster\n    <span class="local-time">their local time is 4:56pm</span>\n  </h4>\n\n  <p>\n    Hey Zoey, have you had a chance to look at the EmberConf brainstorming doc\n    I sent you?\n  </p>\n</section>\n\n<aside class="current-user">\n  <div class="avatar" title="Zoey's avatar">Z</div>\n</aside>\n<section>\n  <h4 class="username">Zoey</h4>\n\n  <p>Hey!</p>\n\n  <p>\n    I love the ideas! I'm really excited about where this year's EmberConf is\n    going, I'm sure it's going to be the best one yet. Some quick notes:\n  </p>\n\n  <ul>\n    <li>\n      Definitely agree that we should double the coffee budget this year (it\n      really is impressive how much we go through!)\n    </li>\n    <li>\n      A blimp would definitely make the venue very easy to find, but I think\n      it might be a bit out of our budget. Maybe we could rent some spotlights\n      instead?\n    </li>\n    <li>\n      We absolutely will need more hamster wheels, last year's line was\n      <em>way</em> too long. Will get on that now before rental season hits\n      its peak.\n    </li>\n  </ul>\n\n  <p>Let me know when you've nailed down the dates!</p>\n</section>\n\n<form>\n  <label for="message">Message</label>\n  <input id="message" />\n  <button type="submit">\n    Send\n  </button>\n</form>\n</div>`,
    `{{!-- generic-link.hbs --}}\n<a href={{@href}} target="_blank" rel="noopener noreferrer">\n{{yield}}</a>`,
    `{{!-- alert-evidence.hbs --}}\n{{#if @evidenceHash.mac_addr}}\n    <dt>{{t "alert_evidence.evidence_keys.mac_address"}}</dt>\n    <dd>{{@evidenceHash.mac_addr}}</dd>\n  {{/if}}\n  {{#if @evidenceHash.is_cust_infra}}\n    <dt>{{t "alert_evidence.evidence_keys.is_cust_infra"}}</dt>\n    <dd>{{@evidenceHash.is_cust_infra}}</dd>\n  {{/if}}\n  {{#if @evidenceHash.is_critical_asset}}\n    <dt>{{t "alert_evidence.evidence_keys.is_critical_asset"}}</dt>\n    <dd>{{@evidenceHash.is_critical_asset}}</dd>\n  {{/if}}\n  {{#if @evidenceHash.vendor}}\n    <dt>{{t "alert_evidence.evidence_keys.vendor"}}</dt>\n    <dd>{{@evidenceHash.vendor}}</dd>\n  {{/if}}`
  ];

  const resp = await fetchData(
    {
      examplesArr: EXAMPLES,
      messagesArr: MESSAGES // Must be odd number for now!
    },
    { isDryRun: false, debug: false }
  );
  const { output, errors } = resp || {};
  const hasErrors = errors?.length;

  console.log(output);

  if (hasErrors) {
    if (output) {
      consoleC.info('\n\n⚠️  Partially completed.');
    } else {
      consoleC.error('\n❗Encountered errors.\n');
    }

    errors?.forEach((error) =>
      consoleC.error('Failed to complete fetch:', error)
    );
  } else {
    consoleC.info('\n\n✅ Completed');
  }
})();
