export namespace OpenApiUI {
  type Props = {
    url: string;
  };

  export const Default = (opt: Props = { url: "/openapi.json" }) =>
    new Response(ScalarUI(opt), {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
    });

  /**
   * Generates HTML to display Rapidoc UI.
   *
   * @see https://rapidocweb.com/
   */
  export function RapidocUI({ url }: Props): string {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
    <title>Documentation</title>
  </head>
  <body>
    <rapi-doc
      spec-url="${url}"
      theme="dark"
      bg-color="#24283b"
      schema-style="tree"
      schema-expand-level="10"
      header-color="#1a1b26"
      allow-try="true"
      nav-hover-bg-color="#1a1b26"
      nav-bg-color="#24283b"
      text-color="#c0caf5"
      nav-text-color="#c0caf5"
      primary-color="#9aa5ce"
      heading-text="Documentation"
      sort-tags="true"
      default-schema-tab="example"
      show-components="true"
      allow-spec-url-load="false"
      allow-spec-file-load="false"
      sort-endpoints-by="path"
    ></rapi-doc>
  </body>
</html>`;
  }

  /**
   * Generates HTML to display Scalar UI.
   *
   * @see https://scalar.com/
   */
  export function ScalarUI({ url }: Props): string {
    return `<!DOCTYPE html>
<html>
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="${url}" data-proxy-url="https://proxy.scalar.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
  }

  /**
   * Generates HTML to display Swagger UI.
   *
   * @see https://swagger.io/tools/swagger-ui/
   */
  export function SwaggerUI({ url }: Props, options = { persistAuthorization: true }): string {
    const swaggerOptions = {
      url,
      ...options,
    };

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.3/swagger-ui-standalone-preset.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.3/swagger-ui-bundle.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.3/swagger-ui.css" />
    <title>Documentation</title>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script>
      window.onload = function() {
        SwaggerUIBundle({
          url: "${url}",
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout",
          ...${JSON.stringify(swaggerOptions)}
        })
      }
    </script>
  </body>
</html>`;
  }
}
