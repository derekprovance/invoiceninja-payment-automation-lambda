.PHONY: integration\:key integration\:start integration\:run integration\:test integration\:stop integration\:clean

ENV_FILE := .env.integration

integration\:key:
	@if [ -f "$(ENV_FILE)" ] && grep -q '^IN_APP_KEY=.\+' "$(ENV_FILE)"; then \
		echo "APP_KEY already set in $(ENV_FILE), skipping generation."; \
	else \
		KEY="base64:$$(openssl rand -base64 32)"; \
		if grep -q '^IN_APP_KEY=' "$(ENV_FILE)" 2>/dev/null; then \
			sed -i "s|^IN_APP_KEY=.*|IN_APP_KEY=$$KEY|" "$(ENV_FILE)"; \
		else \
			echo "IN_APP_KEY=$$KEY" >> "$(ENV_FILE)"; \
		fi; \
		echo "Generated APP_KEY and wrote to $(ENV_FILE)"; \
	fi

integration\:start: integration\:key
	@echo "Starting Docker services..."
	docker compose --env-file "$(ENV_FILE)" up -d
	@echo "Running Invoice Ninja init script..."
	env $$(grep -v '^#' "$(ENV_FILE)" | xargs) bash scripts/init-invoiceninja.sh

integration\:run:
	npm run test:integration

integration\:test: integration\:start
	$(MAKE) 'integration:run'; status=$$?; $(MAKE) 'integration:stop'; exit $$status

integration\:stop:
	docker compose down

integration\:clean:
	docker compose down -v
	rm -f docker/integration.env
	@echo "Cleaned up Docker volumes and integration env file."
