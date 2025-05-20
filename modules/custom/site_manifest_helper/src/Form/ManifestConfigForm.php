namespace Drupal\site_manifest_helper\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

class ManifestConfigForm extends ConfigFormBase {
  public function getFormId() {
    return 'site_manifest_helper_config_form';
  }

  protected function getEditableConfigNames() {
    return ['site_manifest_helper.settings'];
  }

  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('site_manifest_helper.settings');

    $form['enable_views'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Include Views in Manifest'),
      '#default_value' => $config->get('enable_views'),
    ];

    $form['enable_blocks'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Include Blocks in Manifest'),
      '#default_value' => $config->get('enable_blocks'),
    ];

    return parent::buildForm($form, $form_state);
  }

  public function submitForm(array &$form, FormStateInterface $form_state) {
    $this->config('site_manifest_helper.settings')
      ->set('enable_views', $form_state->getValue('enable_views'))
      ->set('enable_blocks', $form_state->getValue('enable_blocks'))
      ->save();

    parent::submitForm($form, $form_state);
  }
}
