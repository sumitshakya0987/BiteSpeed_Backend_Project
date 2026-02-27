import express, { Request, Response } from 'express';
import { PrismaClient, Contact } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

interface IdentifyRequest {
  email?: string;
  phoneNumber?: string | number;
}

app.post('/identify', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber }: IdentifyRequest = req.body;
    const phoneStr = phoneNumber ? phoneNumber.toString() : null;

    if (!email && !phoneStr) {
      return res.status(400).json({ error: "Either email or phoneNumber must be provided." });
    }

    // 1. Find all contacts that match either email or phoneNumber
    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneStr || undefined }
        ]
      }
    });

    if (matchingContacts.length === 0) {
      // No matches, create a new primary contact
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber: phoneStr,
          linkPrecedence: 'primary'
        }
      });

      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: []
        }
      });
    }

    // 2. Determine the ultimate primary contact(s)
    // We need to find the primary contact for each match. If a match is secondary, follow its linkedId.
    // In a properly maintained system, linkedId should point to the primary, but let's be safe.
    
    const primaryIds = new Set<number>();
    for (const contact of matchingContacts) {
      if (contact.linkPrecedence === 'primary') {
        primaryIds.add(contact.id);
      } else if (contact.linkedId) {
        primaryIds.add(contact.linkedId);
      }
    }

    // It's possible that some linkedIds point to contacts that were not in our initial match set.
    // Let's fetch all potential primary contacts to find the oldest one.
    let primaryContacts = await prisma.contact.findMany({
      where: {
        id: { in: Array.from(primaryIds) },
        linkPrecedence: 'primary'
      }
    });

    // If for some reason a linkedId points to a contact that is now secondary, we need to trace back.
    // This could happen if two primaries were merged recently.
    // To simplify and ensure correctness, let's just keep finding the "root" primary.
    const rootPrimaryIds = new Set<number>();
    for (const pc of primaryContacts) {
      let current = pc;
      while (current.linkPrecedence === 'secondary' && current.linkedId) {
        const parent = await prisma.contact.findUnique({ where: { id: current.linkedId } });
        if (!parent) break;
        current = parent;
      }
      rootPrimaryIds.add(current.id);
    }

    primaryContacts = await prisma.contact.findMany({
      where: { id: { in: Array.from(rootPrimaryIds) } },
      orderBy: { createdAt: 'asc' }
    });

    const rootPrimary = primaryContacts[0];
    const otherPrimaryIds = primaryContacts.slice(1).map(c => c.id);

    // 3. If multiple primaries found, merge them
    if (otherPrimaryIds.length > 0) {
      await prisma.contact.updateMany({
        where: {
          OR: [
            { id: { in: otherPrimaryIds } },
            { linkedId: { in: otherPrimaryIds } }
          ]
        },
        data: {
          linkedId: rootPrimary.id,
          linkPrecedence: 'secondary'
        }
      });
    }

    // 4. Check if we need to create a new secondary contact
    // A new secondary is needed if the request contains new information not present in the matching set
    const hasNewEmail = email && !matchingContacts.some(c => c.email === email);
    const hasNewPhone = phoneStr && !matchingContacts.some(c => c.phoneNumber === phoneStr);

    if (hasNewEmail || hasNewPhone) {
        // Double check if this email/phone combination truly doesn't exist yet
        // (to avoid duplicates if called concurrently)
        const existing = await prisma.contact.findFirst({
            where: {
                email: email || null,
                phoneNumber: phoneStr || null,
                linkedId: rootPrimary.id
            }
        });

        if (!existing) {
            await prisma.contact.create({
                data: {
                    email: email || null,
                    phoneNumber: phoneStr || null,
                    linkedId: rootPrimary.id,
                    linkPrecedence: 'secondary'
                }
            });
        }
    }

    // 5. Build response: Fetch all contacts linked to the root primary
    const allLinkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: rootPrimary.id },
          { linkedId: rootPrimary.id }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    const emails = Array.from(new Set(allLinkedContacts.map(c => c.email).filter(Boolean)));
    const phoneNumbers = Array.from(new Set(allLinkedContacts.map(c => c.phoneNumber).filter(Boolean)));
    const secondaryContactIds = allLinkedContacts
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c.id);

    // Ensure primary email/phone are first if they exist
    // Actually, requirement says: "first element being email of primary contact"
    // We'll put rootPrimary's info first if present, then others.
    
    const finalEmails = [rootPrimary.email, ...emails.filter(e => e !== rootPrimary.email)].filter(Boolean) as string[];
    const finalPhoneNumbers = [rootPrimary.phoneNumber, ...phoneNumbers.filter(p => p !== rootPrimary.phoneNumber)].filter(Boolean) as string[];

    return res.status(200).json({
      contact: {
        primaryContatctId: rootPrimary.id,
        emails: finalEmails,
        phoneNumbers: finalPhoneNumbers,
        secondaryContactIds
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
