const previewHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export default {
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/") {
      return Response.json(
        { status: "ok", service: "EasyStarter template preview API", readOnly: true },
        { headers: previewHeaders },
      );
    }

    return Response.json(
      { error: "template_preview_read_only" },
      { headers: previewHeaders, status: 404 },
    );
  },
} satisfies ExportedHandler;
