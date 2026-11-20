import "reflect-metadata";
import { InsightsGateway } from "./insights.gateway";
import { InsightsService } from "./insights.service";

describe("InsightsGateway integration", () => {
  let service: InsightsService;
  let gateway: InsightsGateway;
  let client: any;
  let serverBroadcast: jest.Mock;

  beforeEach(() => {
    service = new InsightsService();
    gateway = new InsightsGateway(service);
    serverBroadcast = jest.fn();
    gateway.server = { to: jest.fn(() => ({ emit: serverBroadcast })) } as any;
    client = {
      id: "socket-1",
      data: { user: { id: "user-1", name: "Test User" } },
      emit: jest.fn(),
    };
  });

  test("validates, stores, broadcasts, and acknowledges a ripple", async () => {
    const result = await gateway.handleRippleEmit(
      { content: "integration payload", meta: { source: "test" } },
      client,
    );

    expect(result).toEqual({ ok: true });
    expect(service.getLatest(1)[0]).toMatchObject({
      authorId: "user-1",
      authorName: "Test User",
      content: "integration payload",
      meta: { source: "test" },
    });
    expect(serverBroadcast).toHaveBeenCalledWith(
      "ripple:broadcast",
      expect.objectContaining({ ok: true }),
    );
    expect(client.emit).toHaveBeenCalledWith(
      "ripple:ack",
      expect.objectContaining({ ok: true }),
    );
  });

  test("rejects non-string content and does not store it", async () => {
    const result = await gateway.handleRippleEmit({ content: 42 }, client);

    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(service.getLatest()).toEqual([]);
    expect(client.emit).toHaveBeenCalledWith(
      "ripple:error",
      expect.objectContaining({ ok: false, error: "validation" }),
    );
    expect(serverBroadcast).not.toHaveBeenCalled();
  });
});
