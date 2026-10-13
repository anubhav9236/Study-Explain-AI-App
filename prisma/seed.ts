import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a sample user
  const user = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      name: 'Sample Student',
    },
  })

  // Create sample study sessions
  const session1 = await prisma.studySession.create({
    data: {
      userId: user.id,
      topic: 'Binary Search Trees',
      subject: 'Data Structures',
      mode: 'exam',
      content: `# Binary Search Trees (BST)

## Definition
A Binary Search Tree is a node-based binary tree data structure that has the following properties:
- The left subtree of a node contains only nodes with keys lesser than the node's key
- The right subtree of a node contains only nodes with keys greater than the node's key
- Both the left and right subtrees must also be binary search trees

## Key Points
- Average case time complexity: O(log n) for search, insert, delete
- Worst case time complexity: O(n) (when tree becomes skewed)
- In-order traversal gives sorted order of elements
- Used in database indexing and implementing sets/maps

## Common Exam Questions
1. What is the time complexity of searching in a balanced BST?
2. Draw the BST after inserting values: 5, 3, 7, 2, 4, 6, 8
3. Explain how to delete a node with two children in a BST`,
    },
  })

  const session2 = await prisma.studySession.create({
    data: {
      userId: user.id,
      topic: 'TCP/IP Protocol Suite',
      subject: 'Computer Networks',
      mode: 'visual',
      content: `# TCP/IP Protocol Suite

## Overview
The TCP/IP protocol suite is a set of protocols used for internet communication. It consists of four layers:

## Layer Architecture
\`\`\`mermaid
graph TD
    A[Application Layer] --> B[Transport Layer]
    B --> C[Internet Layer]
    C --> D[Network Access Layer]
\`\`\`

## Key Protocols
- **Application**: HTTP, FTP, SMTP, DNS
- **Transport**: TCP (reliable), UDP (unreliable but fast)
- **Internet**: IP, ICMP, ARP
- **Network Access**: Ethernet, Wi-Fi

## Important Concepts
- TCP provides reliable, ordered delivery with error checking
- UDP is connectionless and faster but doesn't guarantee delivery
- IP addresses identify devices on a network
- Port numbers identify specific applications`,
    },
  })

  // Create sample flashcards for session 1
  await prisma.flashcard.createMany({
    data: [
      {
        sessionId: session1.id,
        question: 'What is the key property of a Binary Search Tree?',
        answer: 'For any node, all nodes in the left subtree have smaller keys, and all nodes in the right subtree have larger keys.',
      },
      {
        sessionId: session1.id,
        question: 'What is the time complexity of search in a balanced BST?',
        answer: 'O(log n) in the average case, but O(n) in the worst case when the tree becomes skewed.',
      },
      {
        sessionId: session1.id,
        question: 'What traversal method gives sorted order of BST elements?',
        answer: 'In-order traversal (left, root, right) produces elements in ascending sorted order.',
      },
    ],
  })

  // Create sample quiz questions for session 2
  await prisma.quizQuestion.createMany({
    data: [
      {
        sessionId: session2.id,
        question: 'Which protocol provides reliable, ordered delivery?',
        options: JSON.stringify(['UDP', 'TCP', 'IP', 'ARP']),
        correctAnswer: 'TCP',
        explanation: 'TCP (Transmission Control Protocol) provides reliable, ordered, and error-checked delivery of data.',
      },
      {
        sessionId: session2.id,
        question: 'Which layer handles routing between networks?',
        options: JSON.stringify(['Application Layer', 'Transport Layer', 'Internet Layer', 'Network Access Layer']),
        correctAnswer: 'Internet Layer',
        explanation: 'The Internet Layer (IP layer) handles logical addressing and routing of packets across networks.',
      },
      {
        sessionId: session2.id,
        question: 'What is the main advantage of UDP over TCP?',
        options: JSON.stringify(['Reliability', 'Speed', 'Error checking', 'Ordered delivery']),
        correctAnswer: 'Speed',
        explanation: 'UDP is faster than TCP because it has less overhead and does not establish connections or provide reliability guarantees.',
      },
    ],
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
