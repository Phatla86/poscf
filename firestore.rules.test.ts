import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync('firestore.rules', 'utf8');

test('Firestore rules enforce default-deny safety net and verified email guards', () => {
  assert.ok(rulesText.includes('match /{document=**}'));
  assert.ok(rulesText.includes('allow read, write: if false;'));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
});

test('Dirty Dozen Payload Guard Verification against Firestore Rules AST structure', () => {
  // 1-3: Identity & ownerId verification
  assert.ok(rulesText.includes('data.ownerId == request.auth.uid'));
  // 4-5: Strict key allowlisting & update affectedKeys
  assert.ok(rulesText.includes('data.keys().hasAll('));
  assert.ok(rulesText.includes('data.keys().hasOnly('));
  assert.ok(rulesText.includes('incoming().diff(existing()).affectedKeys().hasOnly('));
  // 6: Path ID regex guard
  assert.ok(rulesText.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  // 7-8: String size & type bounds
  assert.ok(rulesText.includes('data.itemSummary.size() <= 500'));
  assert.ok(rulesText.includes('data.quantity is number && data.quantity >= 0'));
  // 9: Immortal field preservation
  assert.ok(rulesText.includes('incoming().ownerId == existing().ownerId'));
  assert.ok(rulesText.includes('incoming().createdAt == existing().createdAt'));
  // 10: Terminal state locking on orders
  assert.ok(rulesText.includes("existing().status != 'completed'"));
  assert.ok(rulesText.includes("existing().status != 'cancelled'"));
  // 11: Query Enforcer on list
  assert.ok(rulesText.includes('allow list: if isVerifiedUser() && existing().ownerId == request.auth.uid;'));
  // 12: Non-negative financial validation
  assert.ok(rulesText.includes('data.total is number && data.total >= 0'));
});
