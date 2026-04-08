/**
 * Map a BotBonnie user object to HubSpot contact properties.
 * Static fields map to predefined custom properties (botbonnie_*).
 * Dynamic parameters map to botbonnie_param_{key} — user must pre-create these in HubSpot.
 */
function mapToHubSpotProperties(user) {
  const props = {};

  // Static field mapping
  if (user.rawId)         props['botbonnie_line_user_id']  = user.rawId;
  if (user.name)          props['botbonnie_display_name']  = user.name;
  if (user.pic)           props['botbonnie_profile_pic']   = user.pic;
  if (user.created)       props['botbonnie_created_at']    = String(user.created);
  if (user.statusMessage) props['botbonnie_status_message'] = user.statusMessage;
  if (user.gender)        props['botbonnie_gender']        = user.gender;
  if (user.location)      props['botbonnie_location']      = user.location;
  if (user.birthday)      props['botbonnie_birthday']      = user.birthday;

  // Map to standard HubSpot properties when available
  if (user.email) props['email'] = user.email;
  if (user.phone) props['phone'] = user.phone;

  // BotBonnie tags: array → comma-separated string
  if (Array.isArray(user.tag) && user.tag.length > 0) {
    props['botbonnie_tags'] = user.tag.join(',');
  }

  // Dynamic custom parameters: { memberId: "VIP" } → botbonnie_param_memberid
  if (user.parameter && typeof user.parameter === 'object') {
    for (const [key, value] of Object.entries(user.parameter)) {
      // Sanitize: lowercase, replace non-alphanumeric with underscore
      const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
      props[`botbonnie_param_${sanitizedKey}`] = String(value);
    }
  }

  return props;
}

module.exports = { mapToHubSpotProperties };
