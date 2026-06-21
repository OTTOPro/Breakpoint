import { SessionState } from "@breakpoint/protocol";

/**
 * SessionDO — step 2.0 stub.
 *
 * No state machine here yet (that's step 2.1). This only proves the binding is
 * wired: it can be addressed, it has identity, and it answers a trivial call.
 */
export class SessionDO {
  private readonly state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(_request: Request): Promise<Response> {
    // Trivial, side-effect-free response proving the DO is reachable.
    return Response.json({
      ok: true,
      id: this.state.id.toString(),
      state: SessionState.Created,
    });
  }
}
