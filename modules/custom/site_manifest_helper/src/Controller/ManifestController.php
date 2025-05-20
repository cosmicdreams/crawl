namespace Drupal\site_manifest_helper\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\JsonResponse;

class ManifestController extends ControllerBase {
  public function generateManifest() {
    $manifest = [];

    // Fetch content types and fields.
    $content_types = \Drupal::entityTypeManager()->getStorage('node_type')->loadMultiple();
    foreach ($content_types as $type_id => $type) {
      $fields = \Drupal::service('entity_field.manager')->getFieldDefinitions('node', $type_id);
      $manifest['content_types'][$type_id] = [
        'fields' => array_map(fn($field) => $field->getType(), $fields),
      ];
    }

    // Fetch views and paths.
    $views = \Drupal\views\Views::getAllViews();
    foreach ($views as $view) {
      $manifest['views'][$view->id()] = [
        'path' => $view->getPath(),
        'display' => $view->get('display'),
      ];
    }

    // Fetch blocks and regions.
    $blocks = \Drupal::service('plugin.manager.block')->getDefinitions();
    foreach ($blocks as $block_id => $block) {
      $manifest['blocks'][$block_id] = [
        'region' => $block['region'] ?? 'unknown',
        'theme' => $block['theme'] ?? 'unknown',
      ];
    }

    // Fetch paragraphs and fields.
    $paragraphs = \Drupal::entityTypeManager()->getStorage('paragraphs_type')->loadMultiple();
    foreach ($paragraphs as $paragraph_id => $paragraph) {
      $fields = \Drupal::service('entity_field.manager')->getFieldDefinitions('paragraph', $paragraph_id);
      $manifest['paragraphs'][$paragraph_id] = [
        'fields' => array_map(fn($field) => $field->getType(), $fields),
      ];
    }

    // Return the manifest as JSON.
    return new JsonResponse($manifest);
  }
}
