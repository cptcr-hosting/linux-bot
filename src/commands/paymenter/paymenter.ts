import type { CommandData, CommandOptions, SlashCommandProps } from "commandkit";
import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  MessageFlags 
} from "discord.js";

import paymenter from "paymenter-api";
// @ts-ignore: 2835
import Schema from "../../models/apiKey";
// @ts-ignore: 2835
import { createFile } from "../../helpers/returnFile";

// Example config import:
// @ts-ignore: 2835
import config from "../../helpers/config";
const shopUrl = config.billing;

export const data = new SlashCommandBuilder()
  .setName("paymenter")
  .setDescription("Manage Paymenter stuff")

  // ==============================
  //       SUBCOMMAND GROUP: ADMIN
  // ==============================
  .addSubcommandGroup((group) =>
    group
      .setName("admin")
      .setDescription("Admin commands")
      .addSubcommand((sub) =>
        sub
          .setName("ticket-create")
          .setDescription("Creates a prebuilt ticket (admin)")
          .addStringOption((o) =>
            o
              .setName("type")
              .setDescription("Prebuilt type")
              .addChoices(
                { name: "Multiple Accounts", value: "multiple_accounts" },
                { name: "Name Violation", value: "name_violation" },
                { name: "Custom", value: "custom" }
              )
              .setRequired(true)
          )
          .addStringOption((o) =>
            o
              .setName("priority")
              .setDescription("Priority")
              .addChoices(
                { name: "High", value: "high" },
                { name: "Medium", value: "medium" },
                { name: "Low", value: "low" }
              )
              .setRequired(true)
          )
          .addNumberOption((o) =>
            o.setName("user-id").setDescription("User ID").setRequired(true)
          )
          .addStringOption((o) =>
            o.setName("custom-title").setDescription("Custom title")
          )
          .addStringOption((o) =>
            o.setName("custom-description").setDescription("Custom description")
          )
      )
      .addSubcommand((sub) =>
        sub.setName("ticket-get-all").setDescription("Get all tickets (admin)")
      )
      .addSubcommand((sub) =>
        sub
          .setName("ticket-get-all-messages")
          .setDescription("Get all messages of a ticket (admin)")
          .addStringOption((o) =>
            o.setName("ticket-id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("ticket-get-data")
          .setDescription("Get all data of a ticket (admin)")
          .addStringOption((o) =>
            o.setName("ticket-id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName("invoice-get-all").setDescription("Get all invoices (admin)")
      )
      .addSubcommand((sub) =>
        sub
          .setName("invoice-get")
          .setDescription("Get invoice by ID (admin)")
          .addStringOption((o) =>
            o
              .setName("invoice-id")
              .setDescription("Invoice ID")
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("invoice-pay")
          .setDescription("Pay an invoice (admin)")
          .addStringOption((o) =>
            o
              .setName("invoice-id")
              .setDescription("Invoice ID")
              .setRequired(true)
          )
          .addStringOption((o) =>
            o
              .setName("payment-method")
              .setDescription("Payment method")
              .addChoices(
                { name: "Manual", value: "Manual" },
                { name: "PayPal", value: "PayPal" },
                { name: "Stripe", value: "Stripe" },
                { name: "Stripe Subscriptions", value: "Stripe Subscriptions" },
                { name: "VivaWallet", value: "VivaWallet" }
              )
              .setRequired(true)
          )
      )
  )

  // =============================
  //      SUBCOMMAND GROUP: USER
  // =============================
  .addSubcommandGroup((group) =>
    group
      .setName("user")
      .setDescription("User commands")
      .addSubcommand((sub) =>
        sub
          .setName("ticket-create")
          .setDescription("Create a ticket (user)")
          .addStringOption((o) =>
            o.setName("title").setDescription("Title").setRequired(true)
          )
          .addStringOption((o) =>
            o
              .setName("description")
              .setDescription("Description")
              .setRequired(true)
          )
          .addStringOption((o) =>
            o
              .setName("priority")
              .setDescription("Priority")
              .addChoices(
                { name: "High", value: "high" },
                { name: "Medium", value: "medium" },
                { name: "Low", value: "low" }
              )
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName("ticket-get-all").setDescription("Get all user tickets")
      )
      .addSubcommand((sub) =>
        sub
          .setName("ticket-get")
          .setDescription("Get user ticket by ID")
          .addStringOption((o) =>
            o.setName("ticket-id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("ticket-get-messages")
          .setDescription("Get all messages of a user ticket")
          .addStringOption((o) =>
            o.setName("ticket-id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("ticket-delete")
          .setDescription("Delete a user ticket by ID")
          .addStringOption((o) =>
            o.setName("ticket-id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName("invoice-get-all").setDescription("Get all invoices (user)")
      )
      .addSubcommand((sub) =>
        sub
          .setName("invoice-get")
          .setDescription("Get invoice by ID (user)")
          .addStringOption((o) =>
            o.setName("invoice-id").setDescription("Invoice ID").setRequired(true)
          )
      ));

export async function run({ interaction }: SlashCommandProps) {
  const userData = await Schema.findOne({ userId: interaction.user.id });
  const apiKey = userData?.paymenter;
  if (!apiKey) {
    return interaction.reply({
      content: "You do not have a stored Paymenter API key. Add one with `/api billing-area add`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const group = interaction.options.getSubcommandGroup();
  const command = interaction.options.getSubcommand();

  // ========== ADMIN GROUP ==========
  if (group === "admin") {
    if (command === "ticket-create") {
      // Cast priority to union type:
      const priority = interaction.options.getString("priority", true) as "high" | "medium" | "low";
      const type = interaction.options.getString("type", true);
      const userId = interaction.options.getNumber("user-id", true);
      const customTitle = interaction.options.getString("custom-title") || "";
      const customDescription = interaction.options.getString("custom-description") || "";

      if (type === "custom" && (!customTitle || !customDescription)) {
        return interaction.reply({
          content: "Please fill out all fields for custom.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const prebuilts: Record<string, { title: string; description: string }> = {
        multiple_accounts: {
          title: "Urgent: Unauthorized Multiple Account Usage",
          description:
            "We have identified multiple accounts under the same user. Contact support.",
        },
        name_violation: {
          title: "Urgent: Name violates TOS",
          description:
            "Your username violates TOS. Please change within 24h or risk termination.",
        },
        custom: {
          title: customTitle,
          description: customDescription,
        },
      };

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const res = await paymenter.Admin.Ticket.create({
          panel: shopUrl,
          apikey: apiKey,
          title: prebuilts[type].title,
          message: prebuilts[type].description,
          priority,
          userId,
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.message || res.statusText);
        }
        const json = await res.json().catch(() => null);
        if (!json?.success) {
          throw new Error(json?.message || "Error creating admin ticket.");
        }

        const ticket = json.data.ticket;
        const embed = new EmbedBuilder()
          .setTitle(ticket.title)
          .setURL(`${shopUrl}/admin/tickets/${ticket.id}`)
          .setDescription(prebuilts[type].description)
          .addFields(
            { name: "Priority", value: priority, inline: true },
            {
              name: "User",
              value: `[#${userId}](${shopUrl}/admin/clients/${userId}/edit)`,
              inline: true,
            },
            {
              name: "Ticket",
              value: `${shopUrl}/admin/tickets/${ticket.id}`,
              inline: true,
            }
          );

        return interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        return interaction.editReply({ content: `Error: ${err.message}` });
      }
    }

    else if (command === "ticket-get-all") {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const res = await paymenter.Admin.Ticket.getAll({ panel: shopUrl, apikey: apiKey });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json?.success) {
          throw new Error(json?.message || "Failed to retrieve admin tickets.");
        }
        const ticketObj = json?.data?.ticket;
        if (!ticketObj) {
          return interaction.editReply({ content: "No ticket data found." });
        }

        const file = await createFile(JSON.stringify(ticketObj, null, 2), "admin_tickets.json");
        return interaction.editReply({ content: "Admin tickets:", files: [file] });
      } catch (e: any) {
        return interaction.editReply({ content: `Error: ${e.message}` });
      }
    }

    else if (command === "ticket-get-all-messages") {
      const ticketId = interaction.options.getString("ticket-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Admin.Ticket.getAllMessages({
          panel: shopUrl,
          apikey: apiKey,
          ticketId,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const js = await r.json();
        if (!js?.success) {
          throw new Error(js?.message || "No messages found.");
        }
        const file = await createFile(
          JSON.stringify(js.data, null, 2),
          "admin_ticket_messages.json"
        );
        return interaction.editReply({
          content: `All messages for admin ticket #${ticketId}:`,
          files: [file],
        });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "ticket-get-data") {
      const ticketId = interaction.options.getString("ticket-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const res = await paymenter.Admin.Ticket.getById({
          panel: shopUrl,
          apikey: apiKey,
          ticketId,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ticketObj = await res.json();
        if (!ticketObj?.id) throw new Error("No valid ticket data.");

        const msgRes = await paymenter.Admin.Ticket.getAllMessages({
          panel: shopUrl,
          apikey: apiKey,
          ticketId,
        });
        if (!msgRes.ok) throw new Error(`HTTP ${msgRes.status}`);
        const msgJson = await msgRes.json();
        if (!msgJson?.success) throw new Error(msgJson?.message || "No messages.");

        const file = await createFile(
          JSON.stringify(msgJson.data, null, 2),
          "admin_ticket_messages.json"
        );
        const embed = new EmbedBuilder()
          .setTitle(`Admin Ticket #${ticketObj.id}`)
          .setURL(`${shopUrl}/admin/tickets/${ticketObj.id}`)
          .setDescription("Ticket data + messages.")
          .addFields(
            { name: "Title", value: ticketObj.title || "No Title" },
            { name: "Status", value: ticketObj.status || "Unknown", inline: true },
            { name: "Priority", value: ticketObj.priority || "Not Set", inline: true },
            { name: "Created", value: ticketObj.created_at || "Unknown" },
            { name: "Updated", value: ticketObj.updated_at || "Unknown" }
          );
        return interaction.editReply({ files: [file], embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "invoice-get-all") {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Admin.Invoice.getAll({ panel: shopUrl, apikey: apiKey });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const j = await r.json();
        if (!j?.success) {
          throw new Error(j?.message || "Failed to retrieve admin invoices.");
        }
        const file = await createFile(
          JSON.stringify({ invoices: j.data, metadata: j.metadata }, null, 2),
          "admin_invoices.json"
        );
        return interaction.editReply({ content: "Admin invoices:", files: [file] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "invoice-get") {
      const invoiceId = interaction.options.getString("invoice-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const res = await paymenter.Admin.Invoice.getById({
          panel: shopUrl,
          apikey: apiKey,
          invoiceId,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!j?.success) {
          throw new Error(j?.message || "Failed to retrieve invoice.");
        }
        const inv = j?.data?.invoice;
        if (!inv) throw new Error("No invoice object.");

        const file = await createFile(
          JSON.stringify(inv, null, 2),
          `admin_invoice_${invoiceId}.json`
        );
        const embed = new EmbedBuilder()
          .setTitle(`Invoice #${inv.id}`)
          .setURL(`${shopUrl}/admin/invoices/${inv.id}`)
          .setDescription("Invoice details.")
          .addFields(
            { name: "Status", value: inv.status || "Unknown", inline: true },
            { name: "User ID", value: String(inv.user_id), inline: true },
            { name: "Paid At", value: inv.paid_at || "N/A" },
            { name: "Due Date", value: inv.due_date || "N/A" }
          );
        return interaction.editReply({ files: [file], embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "invoice-pay") {
      const invoiceId = interaction.options.getString("invoice-id", true);
      const method = interaction.options.getString("payment-method", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Admin.Invoice.pay({
          panel: shopUrl,
          apikey: apiKey,
          invoiceId,
          payment_method: method,
        });
        if (!r.ok) {
          const e = await r.json().catch(() => null);
          throw new Error(e?.message || `HTTP ${r.status}`);
        }
        return interaction.editReply({
          content: `Successfully paid invoice #${invoiceId} via ${method}.`,
        });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }
  }

  // ========== USER GROUP ==========
  else if (group === "user") {
    if (command === "ticket-create") {
      // Cast priority to union
      const priority = interaction.options.getString("priority", true) as "high" | "medium" | "low";
      const title = interaction.options.getString("title", true);
      const description = interaction.options.getString("description", true);

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Ticket.create({
          panel: shopUrl,
          apikey: apiKey,
          title,
          description,
          priority,
        });
        if (!r.ok) {
          const e = await r.json().catch(() => null);
          throw new Error(e?.message || r.statusText);
        }
        const j = await r.json().catch(() => null);
        if (!j?.success) throw new Error(j?.message || "Unknown error.");

        const ticket = j.data.ticket;
        return interaction.editReply({
          content: `Ticket #${ticket.id} created. ${shopUrl}/tickets/${ticket.id}`,
        });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "ticket-get-all") {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Ticket.getAll({ panel: shopUrl, apikey: apiKey });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const j = await r.json();
        if (!j?.success) {
          throw new Error(j?.message || "Failed to retrieve tickets.");
        }
        const t = j?.data?.ticket;
        if (!t) {
          return interaction.editReply({ content: "No tickets found." });
        }
        const f = await createFile(JSON.stringify(t, null, 2), "user_tickets.json");
        return interaction.editReply({ content: "Your tickets:", files: [f] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "ticket-get") {
      const ticketId = interaction.options.getString("ticket-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Ticket.getById({
          panel: shopUrl,
          apikey: apiKey,
          ticketId,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const ticketObj = await r.json();
        if (!ticketObj?.id) throw new Error("No valid ticket data.");

        const embed = new EmbedBuilder()
          .setTitle(`Ticket #${ticketObj.id}`)
          .setURL(`${shopUrl}/tickets/${ticketObj.id}`)
          .addFields(
            { name: "Title", value: ticketObj.title || "No Title" },
            { name: "Status", value: ticketObj.status || "Unknown", inline: true },
            { name: "Priority", value: ticketObj.priority || "N/A", inline: true },
            { name: "Created At", value: ticketObj.created_at || "N/A" }
          );
        return interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "ticket-get-messages") {
      const ticketId = interaction.options.getString("ticket-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Ticket.getMessages({
          panel: shopUrl,
          apikey: apiKey,
          ticketId,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const j = await r.json();
        if (!j?.success) {
          throw new Error(j?.message || "No messages found.");
        }
        const msgs = j.data;
        const f = await createFile(
          JSON.stringify(msgs, null, 2),
          `ticket_${ticketId}_messages.json`
        );
        return interaction.editReply({ files: [f] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "ticket-delete") {
      const ticketId = interaction.options.getString("ticket-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Ticket.deleteById({
          ticketId,
          apikey: apiKey,
          panel: shopUrl,
        });
        if (!r.ok) {
          const e = await r.json().catch(() => null);
          throw new Error(e?.message || r.statusText);
        }
        const j = await r.json().catch(() => null);
        if (!j?.success) {
          throw new Error(j?.message || "Unknown error deleting ticket.");
        }
        return interaction.editReply({ content: `Ticket #${ticketId} deleted.` });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "invoice-get-all") {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Invoice.getAll({ panel: shopUrl, apikey: apiKey });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (!j?.success) {
          throw new Error(j?.message || "Failed to retrieve user invoices.");
        }
        const f = await createFile(
          JSON.stringify({ invoices: j.data, metadata: j.metadata }, null, 2),
          "user_invoices.json"
        );
        return interaction.editReply({ files: [f] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }

    else if (command === "invoice-get") {
      const invoiceId = interaction.options.getString("invoice-id", true);
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const r = await paymenter.Client.Invoice.getById({
          panel: shopUrl,
          apikey: apiKey,
          invoiceId,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (!j?.success) {
          throw new Error(j?.message || "No invoice data.");
        }
        const inv = j?.data?.invoice;
        if (!inv) throw new Error("Missing invoice object.");

        const f = await createFile(
          JSON.stringify(inv, null, 2),
          `user_invoice_${invoiceId}.json`
        );
        const embed = new EmbedBuilder()
          .setTitle(`Invoice #${inv.id}`)
          .setURL(`${shopUrl}/invoice/${inv.id}`)
          .addFields(
            { name: "Status", value: inv.status || "Unknown" },
            { name: "Paid At", value: inv.paid_at || "N/A" },
            { name: "Due Date", value: inv.due_date || "N/A" },
            { name: "Created At", value: inv.created_at || "N/A" }
          );
        return interaction.editReply({ files: [f], embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({ content: `Error: ${error.message}` });
      }
    }
  }

  // Unknown group or subcommand
  return interaction.reply({
    content: "Unknown subcommand group or subcommand.",
    flags: MessageFlags.Ephemeral,
  });
}

export const options: CommandOptions = {
  devOnly: false,
  userPermissions: [],
  botPermissions: [],
  deleted: false,
};
