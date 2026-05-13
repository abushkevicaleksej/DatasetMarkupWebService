import json
import sys
from uvicorn.importer import import_from_string

def main(app_string="app.main:app", output_file="openapi.json"):
    try:
        app = import_from_string(app_string)
        openapi_schema = app.openapi()
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
        print(f"OpenAPI specification successfully exported to '{output_file}'")
    except Exception as e:
        print(f"Error exporting the spec: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()