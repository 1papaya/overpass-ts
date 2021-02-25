# overpass-ts
promise-based overpass api client in typescript

* works in browser & node via `cross-fetch`
* support json & xml/text & stream response
* auto-retry if rate limit (409) or gateway timeout (504)
* helpful error messages

## installation
`npm install overpass-ts`

## api
### overpass(query, opt = {})

* `query`: *string* Overpass API query
* `opt`: *object* Query options
  * `endpoint` *string* Overpass API endpoint URL (usually ends in /interpreter)
  * `rateLimitRetries` *number* How many retries when rate limit/gateway timeout before giving up?
  * `rateLimitPause` *number* Pause in between receiving a rate limited response and initiating a retry
  * `verbose` *boolean* Output verbose query information
  * `stream` *boolean* Return a stream.Readable (in Node) or ReadableStream (in browser)
  * `fetchOpts` *object* Options to be passed to fetch, will overwrite all defaults
  
Returns:
* If query is `[out:json]`, API response as JSON object
* If query is `[out:xml]` or `[out:csv]`, API response as string
* If  `opt.stream = true`, return `stream.Readable` (nodejs) / `ReadableStream` (browser)

## example
```ts
import type { OverpassJson } from "overpass-ts";
import overpass from "overpass-ts";

// json request
overpass(`[out:json]; node(626639517); out ids;`).then((json) => {
  json = json as OverpassJson; // cast correct response type based on query
  assert.deepStrictEqual(json.elements[0], {
    type: "node",
    id: 626639517,
  });
});
```

## license
MIT