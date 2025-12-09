import type { AIGatewayModel } from "@quests/ai-gateway";
import type { ModelMessage } from "ai";

import { describe, expect, it } from "vitest";

import { createMockAIGatewayModelType } from "../test/helpers/mock-ai-gateway-model";
import { filterUnsupportedMedia } from "./filter-unsupported-media";

const createModel = (
  features: AIGatewayModel.ModelFeatures[],
): AIGatewayModel.Type => createMockAIGatewayModelType({ features });

describe("filterUnsupportedMedia", () => {
  it("should pass through messages without file parts", () => {
    const messages: ModelMessage[] = [
      {
        content: "Hello",
        role: "user",
      },
      {
        content: [{ text: "Hi there", type: "text" }],
        role: "assistant",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should keep audio files when model supports inputAudio", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Listen to this", type: "text" },
          {
            data: "data:base64-audio",
            mediaType: "audio/mp3",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "inputAudio", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should replace audio files when model does not support inputAudio", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Listen to this", type: "text" },
          {
            data: "data:base64-audio",
            mediaType: "audio/mp3",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Listen to this",
              "type": "text",
            },
            {
              "text": "[System note: Audio file removed - your model lacks audio input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
          ],
          "role": "user",
        },
      ]
    `);
  });

  it("should keep image files when model supports inputImage", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Look at this", type: "text" },
          {
            data: "base64imagedata",
            mediaType: "image/png",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "inputImage", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should replace image files when model does not support inputImage", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Look at this", type: "text" },
          {
            data: "base64imagedata",
            mediaType: "image/png",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Look at this",
              "type": "text",
            },
            {
              "text": "[System note: Image file removed - your model lacks image input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
          ],
          "role": "user",
        },
      ]
    `);
  });

  it("should handle multiple media types in the same message", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Check these out", type: "text" },
          {
            data: "base64imagedata",
            mediaType: "image/jpeg",
            type: "file",
          },
          {
            data: "data:base64-audio",
            mediaType: "audio/wav",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Check these out",
              "type": "text",
            },
            {
              "text": "[System note: Image file removed - your model lacks image input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
            {
              "text": "[System note: Audio file removed - your model lacks audio input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
          ],
          "role": "user",
        },
      ]
    `);
  });

  it("should filter selectively based on model features", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            data: "base64imagedata",
            mediaType: "image/png",
            type: "file",
          },
          {
            data: "data:base64-audio",
            mediaType: "audio/mp3",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "inputImage", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "data": "base64imagedata",
              "mediaType": "image/png",
              "type": "file",
            },
            {
              "text": "[System note: Audio file removed - your model lacks audio input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
          ],
          "role": "user",
        },
      ]
    `);
  });

  it("should handle messages with string content", () => {
    const messages: ModelMessage[] = [
      {
        content: "System message",
        role: "system",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should handle various audio mime types", () => {
    const audioTypes = ["audio/mp3", "audio/wav", "audio/ogg", "audio/mpeg"];

    for (const mediaType of audioTypes) {
      const messages: ModelMessage[] = [
        {
          content: [
            {
              data: "base64data",
              mediaType,
              type: "file",
            },
          ],
          role: "user",
        },
      ];

      const model = createModel(["inputText", "outputText"]);
      const result = filterUnsupportedMedia({ messages, model });

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "content": [
              {
                "text": "[System note: Audio file removed - your model lacks audio input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
                "type": "text",
              },
            ],
            "role": "user",
          },
        ]
      `);
    }
  });

  it("should handle various image mime types", () => {
    const imageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];

    for (const mediaType of imageTypes) {
      const messages: ModelMessage[] = [
        {
          content: [
            {
              data: "base64data",
              mediaType,
              type: "file",
            },
          ],
          role: "user",
        },
      ];

      const model = createModel(["inputText", "outputText"]);
      const result = filterUnsupportedMedia({ messages, model });

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "content": [
              {
                "text": "[System note: Image file removed - your model lacks image input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
                "type": "text",
              },
            ],
            "role": "user",
          },
        ]
      `);
    }
  });

  it("should not filter non-audio/image file types", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            data: "base64data",
            mediaType: "application/pdf",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should keep video files when model supports inputVideo", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Watch this", type: "text" },
          {
            data: "data:video",
            mediaType: "video/mp4",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "inputVideo", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should replace video files when model does not support inputVideo", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Watch this", type: "text" },
          {
            data: "data:video",
            mediaType: "video/mp4",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Watch this",
              "type": "text",
            },
            {
              "text": "[System note: Video file removed - your model lacks video input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
          ],
          "role": "user",
        },
      ]
    `);
  });

  it("should keep PDF files when model supports inputFile", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Read this document", type: "text" },
          {
            data: "data:pdf",
            mediaType: "application/pdf",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "inputFile", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toEqual(messages);
  });

  it("should replace PDF files when model does not support inputFile", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          { text: "Read this document", type: "text" },
          {
            data: "data:pdf",
            mediaType: "application/pdf",
            type: "file",
          },
        ],
        role: "user",
      },
    ];

    const model = createModel(["inputText", "outputText"]);
    const result = filterUnsupportedMedia({ messages, model });

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Read this document",
              "type": "text",
            },
            {
              "text": "[System note: File file removed - your model lacks file input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
              "type": "text",
            },
          ],
          "role": "user",
        },
      ]
    `);
  });

  it("should handle various video mime types", () => {
    const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/avi"];

    for (const mediaType of videoTypes) {
      const messages: ModelMessage[] = [
        {
          content: [
            {
              data: "base64data",
              mediaType,
              type: "file",
            },
          ],
          role: "user",
        },
      ];

      const model = createModel(["inputText", "outputText"]);
      const result = filterUnsupportedMedia({ messages, model });

      expect(result).toMatchInlineSnapshot(`
        [
          {
            "content": [
              {
                "text": "[System note: Video file removed - your model lacks video input capability. Convert it to a different format or request the user to provide it in a different format if you need to access it.]",
                "type": "text",
              },
            ],
            "role": "user",
          },
        ]
      `);
    }
  });
});
