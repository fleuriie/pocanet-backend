type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type Operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

/**
 * This list of operations is used to generate the manual testing UI.
 */
const operations: Operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update Password",
    endpoint: "/api/users/password",
    method: "PATCH",
    fields: { currentPassword: "input", newPassword: "input" },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },

  // New stuff
  {
    name: "Add System Photocard",
    endpoint: "/api/photocard/add/:tags",
    method: "POST",
    fields: { tags: "input" },
  },
  {
    name: "Delete System Photocard",
    endpoint: "/api/photocard/:id/delete",
    method: "POST",
    fields: { id: "input" },
  },
  {
    name: "Add System Tag",
    endpoint: "/api/photocard/:id/tags/add/:tag",
    method: "POST",
    fields: { id: "input", tag: "input" },
  },
  {
    name: "Delete System Tag",
    endpoint: "/api/photocard/:id/tags/delete/:tag",
    method: "POST",
    fields: { id: "input", tag: "input" },
  },
  {
    name: "View System Catalog",
    endpoint: "/api/catalog/system",
    method: "GET",
    fields: {},
  },
  {
    name: "View User Catalog",
    endpoint: "/api/catalog/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Search System Catalog",
    endpoint: "/api/catalog/system/search/:tags",
    method: "GET",
    fields: { tags: "input" },
  },
  {
    name: "Search User Collection",
    endpoint: "/api/catalog/:username/search/:tags",
    method: "GET",
    fields: { username: "input", tags: "input" },
  },
  {
    name: "User Add Photocard",
    endpoint: "/api/catalog/edit/add/:photocard",
    method: "POST",
    fields: { photocard: "input" },
  },
  {
    name: "User Remove Photocard",
    endpoint: "/api/catalog/edit/remove/:photocard",
    method: "POST",
    fields: { photocard: "input" },
  },
  {
    name: "User Add Tag",
    endpoint: "/api/catalog/edit/add/:photocard/:tag",
    method: "POST",
    fields: { photocard: "input", tag: "input" },
  },
  {
    name: "User Remove Tag",
    endpoint: "/api/catalog/edit/remove/:photocard/:tag",
    method: "POST",
    fields: { photocard: "input", tag: "input" },
  },
  {
    name: "Mark Photocard As Available",
    endpoint: "/api/catalog/edit/avail/:photocard",
    method: "POST",
    fields: { photocard: "input" },
  },
  {
    name: "Mark Photocard As Unavailable",
    endpoint: "/api/catalog/edit/unavail/:photocard",
    method: "POST",
    fields: { photocard: "input" },
  },
  {
    name: "Discover a New Photocard",
    endpoint: "/api/discover",
    method: "GET",
    fields: {},
  },
  {
    name: "Send Message",
    endpoint: "/api/message/send/:to/:m",
    method: "POST",
    fields: { to: "input", m: "input" },
  },
  {
    name: "Read Message From User",
    endpoint: "/api/message/read/:from/:to",
    method: "POST",
    fields: { from: "input", to: "input" },
  },
  {
    name: "Block User",
    endpoint: "/api/message/block/:user",
    method: "POST",
    fields: { user: "input" },
  },
  {
    name: "Unblock User",
    endpoint: "/api/message/unblock/:user",
    method: "POST",
    fields: { user: "input" },
  },
  {
    name: "Leave Feedback for User",
    endpoint: "/api/reviews/leave/:user/:rating/:review",
    method: "POST",
    fields: { user: "input", rating: "input", review: "input" },
  },
  {
    name: "Get Average Rating for User",
    endpoint: "/api/reviews/getaverage/:user",
    method: "GET",
    fields: { user: "input" },
  },
  {
    name: "Get Feedback for User",
    endpoint: "/api/reviews/seefeedback/:user",
    method: "GET",
    fields: { user: "input" },
  },
];


/*
 * You should not need to edit below.
 * Please ask if you have questions about what this test code is doing!
 */

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
